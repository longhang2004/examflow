import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionsDto } from './dto/add-questions.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { ExamStatus, Role } from '@prisma/client';

function generateAccessCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  private async assertOwner(examId: string, userId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isOwner = exam.creatorId === userId;
    const isOrgAdmin =
      user?.role === Role.ORG_ADMIN && exam.organizationId === user.organizationId;

    if (!isOwner && !isOrgAdmin) {
      throw new ForbiddenException('Access denied');
    }
    return exam;
  }

  async create(userId: string, dto: CreateExamDto) {
    let accessCode: string;
    let unique = false;
    do {
      accessCode = generateAccessCode();
      const existing = await this.prisma.exam.findUnique({ where: { accessCode } });
      unique = !existing;
    } while (!unique);

    const defaultConfig = {
      duration: null,
      maxAttempts: 1,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultAfter: true,
      startAt: null,
      endAt: null,
    };

    return this.prisma.exam.create({
      data: {
        title: dto.title,
        description: dto.description,
        creatorId: userId,
        config: { ...defaultConfig, ...dto.config },
        accessCode,
        organizationId: dto.organizationId,
        status: ExamStatus.DRAFT,
      },
    });
  }

  async findAll(userId: string, query: QueryExamDto) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const where: any = {
      OR: [
        { creatorId: userId },
        ...(user?.organizationId ? [{ organizationId: user.organizationId }] : []),
      ],
    };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { questions: true, attempts: true } },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId: string) {
    const exam = await this.assertOwner(id, userId);
    return this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findByAccessCode(code: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { accessCode: code },
      include: {
        _count: { select: { questions: true } },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    const { accessCode, ...publicInfo } = exam;
    return publicInfo;
  }

  async update(id: string, userId: string, dto: UpdateExamDto) {
    const exam = await this.assertOwner(id, userId);
    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException('Can only edit DRAFT exams');
    }
    const { organizationId, config, ...rest } = dto;
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...rest,
        ...(config && { config: config as any }),
        ...(organizationId && {
          organization: { connect: { id: organizationId } },
        }),
      },
    });
  }

  async addQuestions(examId: string, userId: string, dto: AddQuestionsDto) {
    await this.assertOwner(examId, userId);

    const ops = dto.questions.map((q) =>
      this.prisma.examQuestion.upsert({
        where: { examId_questionId: { examId, questionId: q.questionId } },
        update: { point: q.point, order: q.order },
        create: { examId, questionId: q.questionId, point: q.point, order: q.order },
      }),
    );

    await this.prisma.$transaction(ops);
    return this.findOne(examId, userId);
  }

  async removeQuestion(examId: string, questionId: string, userId: string) {
    await this.assertOwner(examId, userId);
    await this.prisma.examQuestion.delete({
      where: { examId_questionId: { examId, questionId } },
    });
    return { message: 'Question removed' };
  }

  async publish(examId: string, userId: string) {
    const exam = await this.assertOwner(examId, userId);

    const questionCount = await this.prisma.examQuestion.count({ where: { examId } });
    if (questionCount === 0) {
      throw new BadRequestException('Exam must have at least one question to publish');
    }

    return this.prisma.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.PUBLISHED },
    });
  }

  async archive(examId: string, userId: string) {
    await this.assertOwner(examId, userId);
    return this.prisma.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.ARCHIVED },
    });
  }

  async getResults(examId: string, userId: string) {
    await this.assertOwner(examId, userId);

    const attempts = await this.prisma.attempt.findMany({
      where: {
        examId,
        status: { in: ['SUBMITTED', 'GRADED'] },
      },
      include: { user: { select: { id: true, displayName: true, email: true } } },
    });

    return attempts;
  }
}
