import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Sm2Service } from './sm2.service';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private sm2: Sm2Service,
  ) {}

  async addToReviewQueue(userId: string, questionId: string) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Question not found');

    return this.prisma.reviewCard.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {},
      create: { userId, questionId },
    });
  }

  async getReviewDue(userId: string, limit = 20) {
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
    const now = new Date();

    const [cards, totalDue, nextDue] = await Promise.all([
      this.prisma.reviewCard.findMany({
        where: { userId, nextReviewAt: { lte: now } },
        orderBy: { nextReviewAt: 'asc' },
        take: safeLimit,
        include: { question: true },
      }),
      this.prisma.reviewCard.count({
        where: { userId, nextReviewAt: { lte: now } },
      }),
      this.prisma.reviewCard.findFirst({
        where: { userId, nextReviewAt: { gt: now } },
        orderBy: { nextReviewAt: 'asc' },
        select: { nextReviewAt: true },
      }),
    ]);

    return { cards, totalDue, nextDueAt: nextDue?.nextReviewAt ?? null };
  }

  async submitReview(
    userId: string,
    questionId: string,
    quality: number,
    timeTaken: number,
  ) {
    if (quality < 0 || quality > 5) {
      throw new BadRequestException('Quality must be between 0 and 5');
    }

    const card = await this.prisma.reviewCard.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    if (!card) throw new NotFoundException('Review card not found');

    const next = this.sm2.calculate({
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
      quality,
    });

    const updated = await this.prisma.reviewCard.update({
      where: { id: card.id },
      data: {
        easeFactor: next.easeFactor,
        interval: next.interval,
        repetitions: next.repetitions,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: new Date(),
      },
      include: { question: true },
    });

    await this.prisma.reviewSession.create({
      data: {
        userId,
        cards: [{ questionId, quality, timeTaken }],
      },
    });

    return updated;
  }

  async getReviewStats(userId: string) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [
      totalCards,
      dueToday,
      dueTomorrow,
      dueThisWeek,
      masteredCards,
      newCards,
      avg,
      sessions,
    ] = await Promise.all([
      this.prisma.reviewCard.count({ where: { userId } }),
      this.prisma.reviewCard.count({ where: { userId, nextReviewAt: { lte: now } } }),
      this.prisma.reviewCard.count({
        where: { userId, nextReviewAt: { gt: now, lte: tomorrow } },
      }),
      this.prisma.reviewCard.count({
        where: { userId, nextReviewAt: { gt: now, lte: weekEnd } },
      }),
      this.prisma.reviewCard.count({ where: { userId, repetitions: { gte: 5 } } }),
      this.prisma.reviewCard.count({ where: { userId, repetitions: 0 } }),
      this.prisma.reviewCard.aggregate({
        where: { userId },
        _avg: { easeFactor: true },
      }),
      this.prisma.reviewSession.findMany({
        where: { userId },
        orderBy: { reviewedAt: 'desc' },
        take: 120,
        select: { reviewedAt: true },
      }),
    ]);

    return {
      totalCards,
      dueToday,
      dueTomorrow,
      dueThisWeek,
      masteredCards,
      newCards,
      averageEaseFactor: avg._avg.easeFactor ?? 0,
      streakDays: this.calculateStreakDays(sessions.map((s) => s.reviewedAt)),
    };
  }

  async bulkAddFromAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();

    const answers = attempt.answers as Array<{
      questionId?: string;
      isCorrect?: boolean | null;
    }>;
    const questionIds = [
      ...new Set(
        answers
          .filter((a) => a.questionId && (a.isCorrect === false || a.isCorrect === null))
          .map((a) => a.questionId as string),
      ),
    ];

    for (const questionId of questionIds) {
      await this.addToReviewQueue(userId, questionId);
    }

    return { added: questionIds.length };
  }

  private calculateStreakDays(reviewedAtDates: Date[]) {
    const reviewedDays = new Set(
      reviewedAtDates.map((date) => date.toISOString().slice(0, 10)),
    );
    let streak = 0;
    const cursor = new Date();

    while (reviewedDays.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }
}
