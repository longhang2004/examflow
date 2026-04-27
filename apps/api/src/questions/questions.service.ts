import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { Role } from '@prisma/client';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  private normalizeTags(tags?: string[]) {
    if (!tags?.length) return [];
    const seen = new Map<string, string>();
    for (const rawTag of tags) {
      const tag = rawTag.trim().replace(/\s+/g, ' ');
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (!seen.has(key)) seen.set(key, tag);
    }
    return [...seen.values()];
  }

  async create(userId: string, dto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: {
        creatorId: userId,
        type: dto.type,
        content: dto.content,
        config: dto.config,
        tags: this.normalizeTags(dto.tags),
        difficulty: dto.difficulty ?? 1,
        isPublic: dto.isPublic ?? false,
        organizationId: dto.organizationId,
      },
    });
  }

  async findAll(userId: string, query: QueryQuestionDto) {
    const { page = 1, limit = 20, type, difficulty, tags, search, organizationId } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const tagList = tags ? this.normalizeTags(tags.split(',')) : undefined;

    const where: any = {
      OR: [
        { creatorId: userId },
        { isPublic: true },
        ...(user?.organizationId ? [{ organizationId: user.organizationId }] : []),
      ],
    };

    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    if (tagList?.length) where.tags = { hasSome: tagList };
    if (organizationId) where.organizationId = organizationId;
    if (search) where.content = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, displayName: true } } },
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findTags(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const where: any = {
      OR: [
        { creatorId: userId },
        { isPublic: true },
        ...(user?.organizationId ? [{ organizationId: user.organizationId }] : []),
      ],
    };

    const questions = await this.prisma.question.findMany({
      where,
      select: { tags: true },
      take: 1000,
      orderBy: { createdAt: 'desc' },
    });

    const counts = new Map<string, { label: string; count: number }>();
    for (const question of questions) {
      for (const tag of this.normalizeTags(question.tags)) {
        const key = tag.toLowerCase();
        const existing = counts.get(key);
        counts.set(key, {
          label: existing?.label ?? tag,
          count: (existing?.count ?? 0) + 1,
        });
      }
    }

    return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  async findOne(id: string, userId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { creator: { select: { id: true, displayName: true } } },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const hasAccess =
      question.creatorId === userId ||
      question.isPublic ||
      (user?.organizationId && question.organizationId === user.organizationId);

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return question;
  }

  async update(id: string, userId: string, dto: UpdateQuestionDto) {
    const question = await this.findOne(id, userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const canEdit =
      question.creatorId === userId ||
      (user?.role === Role.ORG_ADMIN && question.organizationId === user.organizationId);

    if (!canEdit) {
      throw new ForbiddenException('You cannot edit this question');
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        ...dto,
        tags: dto.tags ? this.normalizeTags(dto.tags) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    const question = await this.findOne(id, userId);

    if (question.creatorId !== userId) {
      throw new ForbiddenException('You cannot delete this question');
    }

    const usedInPublished = await this.prisma.examQuestion.findFirst({
      where: {
        questionId: id,
        exam: { status: 'PUBLISHED' },
      },
    });

    if (usedInPublished) {
      throw new ForbiddenException('Cannot delete a question used in a published exam');
    }

    return this.prisma.question.delete({ where: { id } });
  }
}
