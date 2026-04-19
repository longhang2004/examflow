import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttemptStatus, ExamStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { GradingService } from './grading.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Injectable()
export class AttemptsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private grading: GradingService,
  ) {}

  async start(userId: string, dto: StartAttemptDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: dto.examId },
      include: {
        questions: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) throw new NotFoundException('Exam not found');
    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new BadRequestException('Exam is not available');
    }

    const config = exam.config as any;

    if (config.startAt && new Date(config.startAt) > new Date()) {
      throw new BadRequestException('Exam has not started yet');
    }
    if (config.endAt && new Date(config.endAt) < new Date()) {
      throw new BadRequestException('Exam has already ended');
    }

    if (exam.accessCode && dto.accessCode !== exam.accessCode) {
      throw new BadRequestException('Invalid access code');
    }

    const existingAttempts = await this.prisma.attempt.findMany({
      where: { examId: dto.examId, userId },
    });

    const inProgress = existingAttempts.find((a) => a.status === AttemptStatus.IN_PROGRESS);
    if (inProgress) {
      const questions = await this.prisma.examQuestion.findMany({
        where: { examId: dto.examId },
        include: { question: true },
        orderBy: { order: 'asc' },
      });
      return { attempt: inProgress, questions };
    }

    const completedCount = existingAttempts.filter(
      (a) => a.status !== AttemptStatus.IN_PROGRESS,
    ).length;

    if (completedCount >= config.maxAttempts) {
      throw new BadRequestException('You have reached the maximum number of attempts');
    }

    let questionIds = exam.questions.map((eq) => eq.questionId);
    if (config.shuffleQuestions) {
      questionIds = shuffleArray(questionIds);
    }

    const maxScore = exam.questions.reduce((sum, eq) => sum + eq.point, 0);

    const attempt = await this.prisma.attempt.create({
      data: {
        examId: dto.examId,
        userId,
        questionOrder: questionIds,
        answers: [],
        status: AttemptStatus.IN_PROGRESS,
        maxScore,
      },
    });

    if (config.duration) {
      await this.redis.set(
        `attempt:${attempt.id}:timer`,
        Date.now().toString(),
        config.duration * 60,
      );
    }

    let questions = exam.questions;
    if (config.shuffleOptions) {
      questions = questions.map((eq) => {
        const q = { ...eq.question, config: { ...(eq.question.config as any) } };
        if (q.config.options) {
          q.config.options = shuffleArray(q.config.options);
        }
        return { ...eq, question: q };
      });
    }

    return { attempt, questions };
  }

  async saveAnswer(userId: string, attemptId: string, dto: SaveAnswerDto) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress');
    }

    const timerKey = `attempt:${attemptId}:timer`;
    const timerExists = await this.redis.exists(timerKey);

    const exam = await this.prisma.exam.findUnique({ where: { id: attempt.examId } });
    const config = exam?.config as any;

    if (config?.duration && !timerExists) {
      return this.submit(userId, attemptId);
    }

    if (!attempt.questionOrder.includes(dto.questionId)) {
      throw new BadRequestException('Question not in this attempt');
    }

    const answers = attempt.answers as any[];
    const existing = answers.findIndex((a) => a.questionId === dto.questionId);
    const answerEntry = {
      questionId: dto.questionId,
      answer: dto.answer,
      timeSpent: dto.timeSpent,
    };

    if (existing >= 0) {
      answers[existing] = answerEntry;
    } else {
      answers.push(answerEntry);
    }

    return this.prisma.attempt.update({
      where: { id: attemptId },
      data: { answers },
    });
  }

  async submit(userId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt already submitted');
    }

    const examQuestions = await this.prisma.examQuestion.findMany({
      where: { examId: attempt.examId },
      include: { question: true },
    });

    const answers = attempt.answers as any[];
    const gradedAnswers = this.grading.gradeAttempt(answers, examQuestions);

    const hasEssay = gradedAnswers.some((a) => a.isCorrect === null && a.pointEarned === null);
    const status = hasEssay ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED;

    const totalScore = gradedAnswers.reduce((sum, a) => sum + (a.pointEarned ?? 0), 0);

    const updated = await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status,
        submittedAt: new Date(),
        totalScore,
        answers: gradedAnswers as any,
      },
    });

    await this.redis.del(`attempt:${attemptId}:timer`);
    return updated;
  }

  async findOne(userId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: {
              include: { question: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();

    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      const { answers, ...rest } = attempt;
      const sanitizedAnswers = (answers as any[]).map(({ questionId, answer, timeSpent }) => ({
        questionId,
        answer,
        timeSpent,
      }));
      return { ...rest, answers: sanitizedAnswers, questions: attempt.exam.questions };
    }

    const config = attempt.exam.config as any;
    if (!config?.showResultAfter) {
      const { answers, ...rest } = attempt;
      return {
        ...rest,
        answers: (answers as any[]).map(({ questionId, answer, timeSpent, pointEarned }) => ({
          questionId,
          answer,
          timeSpent,
          pointEarned,
        })),
      };
    }

    return attempt;
  }

  async findMyAttempts(userId: string, examId?: string) {
    const where: any = { userId };
    if (examId) where.examId = examId;

    return this.prisma.attempt.findMany({
      where,
      select: {
        id: true,
        examId: true,
        status: true,
        totalScore: true,
        maxScore: true,
        startedAt: true,
        submittedAt: true,
        exam: { select: { title: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}
