import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Plan } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentParserService } from './document-parser.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';

type AiProvider = 'openai' | 'gemini';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;
  private readonly provider: AiProvider;

  constructor(
    private configService: ConfigService,
    private redis: RedisService,
    private prisma: PrismaService,
    private documentParser: DocumentParserService,
  ) {
    this.provider = this.getProvider();
    const apiKey = this.getApiKey();
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        baseURL: this.getBaseUrl(),
      });
    }
  }

  private getProvider(): AiProvider {
    const configured = this.configService.get<string>('AI_PROVIDER')?.toLowerCase();
    if (configured === 'gemini' || configured === 'openai') {
      return configured;
    }
    if (this.configService.get<string>('GEMINI_API_KEY')) {
      return 'gemini';
    }
    return 'openai';
  }

  private getApiKey(): string | undefined {
    return this.provider === 'gemini'
      ? this.configService.get<string>('GEMINI_API_KEY')
      : this.configService.get<string>('OPENAI_API_KEY');
  }

  private getBaseUrl(): string | undefined {
    if (this.provider !== 'gemini') return undefined;
    return (
      this.configService.get<string>('GEMINI_BASE_URL') ||
      'https://generativelanguage.googleapis.com/v1beta/openai/'
    );
  }

  private getModel(): string {
    if (this.provider === 'gemini') {
      return (
        this.configService.get<string>('GEMINI_MODEL') ||
        this.configService.get<string>('AI_MODEL') ||
        'gemini-2.5-flash-lite'
      );
    }

    return (
      this.configService.get<string>('OPENAI_MODEL') ||
      this.configService.get<string>('AI_MODEL') ||
      'gpt-4o-mini'
    );
  }

  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new InternalServerErrorException(
        this.provider === 'gemini'
          ? 'AI features are not available. GEMINI_API_KEY is not configured.'
          : 'AI features are not available. OPENAI_API_KEY is not configured.',
      );
    }
    return this.client;
  }

  private parseJsonObject(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI response is not valid JSON');
      return JSON.parse(match[0]);
    }
  }

  private async getUserPlanLimit(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    switch (user?.plan ?? Plan.FREE) {
      case Plan.PRO:
        return 30;
      case Plan.ENTERPRISE:
        return 100;
      case Plan.FREE:
      default:
        return 5;
    }
  }

  // Rate limiting
  private async checkRateLimit(userId: string): Promise<{ used: number; limit: number; resetsAt: string }> {
    const key = `ai:ratelimit:${userId}`;
    const currentStr = await this.redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const limit = await this.getUserPlanLimit(userId);

    const ttl = await this.redis.ttl(key);
    const resetsAt = ttl > 0
      ? new Date(Date.now() + ttl * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    if (current >= limit) {
      throw new HttpException(
        `AI rate limit exceeded. Limit: ${limit}/hour. Resets at ${resetsAt}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return { used: current, limit, resetsAt };
  }

  private async incrementRateLimit(userId: string): Promise<void> {
    const key = `ai:ratelimit:${userId}`;
    const currentStr = await this.redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const ttl = await this.redis.ttl(key);

    if (current === 0 || ttl <= 0) {
      await this.redis.set(key, '1', 3600); // 1 hour TTL
    } else {
      await this.redis.set(key, String(current + 1), ttl);
    }
  }

  async getUsage(userId: string): Promise<{ used: number; limit: number; resetsAt: string }> {
    const key = `ai:ratelimit:${userId}`;
    const currentStr = await this.redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const limit = await this.getUserPlanLimit(userId);
    const ttl = await this.redis.ttl(key);
    const resetsAt = ttl > 0
      ? new Date(Date.now() + ttl * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    return { used: current, limit, resetsAt };
  }

  async generateQuestionsFromText(
    text: string,
    dto: GenerateQuestionsDto,
    userId: string,
  ) {
    const openai = this.ensureClient();
    await this.checkRateLimit(userId);

    const sanitizedText = this.documentParser.sanitizeText(text);

    const systemPrompt = `Bạn là chuyên gia giáo dục có nhiệm vụ tạo câu hỏi kiểm tra từ nội dung tài liệu.

Quy tắc bắt buộc:
1. Câu hỏi phải bám sát nội dung tài liệu, không bịa đặt thông tin
2. Ngôn ngữ: ${dto.language === 'vi' ? 'Tiếng Việt' : 'English'}
3. Trả về JSON hợp lệ, không có text thừa trước hoặc sau JSON
4. Đảm bảo đáp án chính xác và có giải thích rõ ràng

Format JSON output:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE | MULTIPLE_SELECT | TRUE_FALSE | FILL_BLANK | ESSAY",
      "content": "Nội dung câu hỏi",
      "config": {
        // MULTIPLE_CHOICE: { options: [{ id: "a", text: "..." }, ...], correctAnswer: "a" }
        // MULTIPLE_SELECT: { options: [{ id: "a", text: "..." }, ...], correctAnswers: ["a", "b"], partialCredit: true }
        // TRUE_FALSE: { correctAnswer: true | false }
        // FILL_BLANK: { correctAnswers: ["answer1", "answer2"], caseSensitive: false }
        // ESSAY: { rubric: "Rubric text", maxWords: 500 }
      },
      "tags": ["tag1", "tag2"],
      "difficulty": 1 | 2 | 3,
      "explanation": "Giải thích tại sao đây là đáp án đúng"
    }
  ]
}`;

    const userPrompt = `Tài liệu:
---
${sanitizedText}
---

Yêu cầu:
- Tạo ${dto.count} câu hỏi
- Loại câu hỏi: ${dto.questionTypes.join(', ')}
- Độ khó: ${dto.difficulty} (1=dễ, 2=trung bình, 3=khó)
${dto.additionalInstructions ? `- ${dto.additionalInstructions}` : ''}

Phân bổ số lượng đều nhau giữa các loại câu hỏi được yêu cầu.`;

    let response: any;
    let tokensUsed = 0;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const completion = await openai.chat.completions.create({
          model: this.getModel(),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.7,
          response_format: { type: 'json_object' },
        });

        tokensUsed = completion.usage?.total_tokens ?? 0;
        const content = completion.choices[0]?.message?.content ?? '';

        response = this.parseJsonObject(content);

        if (!response.questions || !Array.isArray(response.questions)) {
          throw new Error('Response missing questions array');
        }

        // Validate each question has required fields
        response.questions = response.questions.filter((q: any) => {
          return q.type && q.content && q.config;
        });

        break; // Success
      } catch (error: any) {
        if (attempt === 1) {
          this.logger.error(`AI generation failed after 2 attempts: ${error.message}`);
          throw new InternalServerErrorException(
            'AI không thể tạo câu hỏi. Vui lòng thử lại.',
          );
        }
        this.logger.warn(`AI attempt ${attempt + 1} failed, retrying: ${error.message}`);
      }
    }

    await this.incrementRateLimit(userId);

    return {
      questions: response.questions,
      extractedTextPreview: sanitizedText.substring(0, 200),
      tokensUsed,
    };
  }

  async generateQuestionsFromFile(
    file: Express.Multer.File,
    dto: GenerateQuestionsDto,
    userId: string,
  ) {
    const text = await this.documentParser.extractText(file);
    return this.generateQuestionsFromText(text, dto, userId);
  }

  async suggestTags(content: string): Promise<string[]> {
    const openai = this.ensureClient();

    try {
      const completion = await openai.chat.completions.create({
        model: this.getModel(),
        messages: [
          {
            role: 'user',
            content: `Từ nội dung câu hỏi sau, gợi ý 3-5 tags ngắn gọn (1-2 từ mỗi tag). Trả về JSON object dạng {"tags": ["tag1", "tag2"]}. Nội dung: ${content}`,
          },
        ],
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = this.parseJsonObject(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x)).slice(0, 5);
      }
      if (Array.isArray(parsed?.tags)) {
        return parsed.tags.map((x: unknown) => String(x)).slice(0, 5);
      }
      return [];
    } catch {
      return [];
    }
  }

  async suggestDifficulty(content: string, correctAnswer: any): Promise<1 | 2 | 3> {
    const openai = this.ensureClient();

    try {
      const completion = await openai.chat.completions.create({
        model: this.getModel(),
        messages: [
          {
            role: 'user',
            content: `Đánh giá độ khó (1=dễ/2=trung bình/3=khó) cho câu hỏi sau. Trả về JSON: {"difficulty": number}. Câu hỏi: ${content}. Đáp án: ${JSON.stringify(correctAnswer)}`,
          },
        ],
        max_tokens: 50,
        response_format: { type: 'json_object' },
      });

      const result = this.parseJsonObject(completion.choices[0]?.message?.content ?? '{}');
      const d = result.difficulty;
      if (d === 1 || d === 2 || d === 3) return d;
      return 2;
    } catch {
      return 2;
    }
  }
}
