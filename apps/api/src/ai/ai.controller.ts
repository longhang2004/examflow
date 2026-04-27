import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import {
  GenerateQuestionsDto,
  GenerateFromTextDto,
  SuggestTagsDto,
  SuggestDifficultyDto,
} from './dto/generate-questions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @ApiOperation({ summary: 'Generate questions from uploaded file (PDF/DOCX/TXT)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Questions generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Post('generate/file')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only PDF, DOCX, and TXT files are allowed'), false);
        }
      },
    }),
  )
  generateFromFile(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerateQuestionsDto,
  ) {
    return this.aiService.generateQuestionsFromFile(file, dto, user.id);
  }

  @ApiOperation({ summary: 'Generate questions from pasted text' })
  @ApiResponse({ status: 201, description: 'Questions generated successfully' })
  @Post('generate/text')
  generateFromText(@CurrentUser() user: any, @Body() dto: GenerateFromTextDto) {
    return this.aiService.generateQuestionsFromText(dto.text, dto, user.id);
  }

  @ApiOperation({ summary: 'Suggest tags for a question' })
  @ApiResponse({ status: 200, description: 'Suggested tags returned' })
  @Post('suggest/tags')
  async suggestTags(@Body() dto: SuggestTagsDto) {
    const tags = await this.aiService.suggestTags(dto.content);
    return { tags };
  }

  @ApiOperation({ summary: 'Suggest difficulty level for a question' })
  @ApiResponse({ status: 200, description: 'Difficulty level returned' })
  @Post('suggest/difficulty')
  async suggestDifficulty(@Body() dto: SuggestDifficultyDto) {
    const difficulty = await this.aiService.suggestDifficulty(dto.content, dto.correctAnswer);
    return { difficulty };
  }

  @ApiOperation({ summary: 'Get AI usage for current user' })
  @ApiResponse({ status: 200, description: 'Usage stats' })
  @Get('usage')
  getUsage(@CurrentUser() user: any) {
    return this.aiService.getUsage(user.id);
  }
}
