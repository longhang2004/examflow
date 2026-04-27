import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ParentStudentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentService {
  constructor(private prisma: PrismaService) {}

  async sendLinkRequest(parentId: string, studentEmail: string) {
    const parent = await this.prisma.user.findUnique({ where: { id: parentId } });
    if (!parent || parent.role !== Role.PARENT) {
      throw new ForbiddenException('Only parent accounts can send link requests');
    }

    const student = await this.prisma.user.findUnique({
      where: { email: studentEmail.toLowerCase().trim() },
      select: { id: true, role: true },
    });

    if (student?.role === Role.STUDENT) {
      await this.prisma.parentStudent.upsert({
        where: {
          parentId_studentId: { parentId, studentId: student.id },
        },
        update: {
          status: ParentStudentStatus.PENDING,
        },
        create: {
          parentId,
          studentId: student.id,
          status: ParentStudentStatus.PENDING,
        },
      });
    }

    return {
      message:
        'If that student account exists, a link request has been sent for confirmation.',
    };
  }

  async respondToLinkRequest(studentId: string, parentId: string, accept: boolean) {
    const link = await this.prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });
    if (!link) throw new NotFoundException('Link request not found');
    if (link.status !== ParentStudentStatus.PENDING) {
      throw new BadRequestException('This request has already been handled');
    }

    return this.prisma.parentStudent.update({
      where: { parentId_studentId: { parentId, studentId } },
      data: {
        status: accept ? ParentStudentStatus.ACCEPTED : ParentStudentStatus.REJECTED,
      },
      include: {
        parent: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async getMyStudents(parentId: string) {
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId, status: ParentStudentStatus.ACCEPTED },
      include: {
        student: {
          select: { id: true, displayName: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      links.map(async (link) => ({
        student: link.student,
        stats: await this.getStudentSummaryStats(link.studentId),
      })),
    );
  }

  async getStudentDetail(parentId: string, studentId: string) {
    await this.ensureLinked(parentId, studentId);

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, displayName: true, email: true, avatarUrl: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const [recentAttempts, weeklyProgress, reviewStats, weakTopics] =
      await Promise.all([
        this.getRecentAttempts(studentId),
        this.getWeeklyProgress(studentId),
        this.getReviewStats(studentId),
        this.getWeakTopics(studentId),
      ]);

    return {
      student,
      recentAttempts,
      weeklyProgress,
      reviewStats,
      weakTopics,
    };
  }

  async getPendingRequests(studentId: string) {
    return this.prisma.parentStudent.findMany({
      where: { studentId, status: ParentStudentStatus.PENDING },
      include: {
        parent: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async ensureLinked(parentId: string, studentId: string) {
    const link = await this.prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });

    if (!link || link.status !== ParentStudentStatus.ACCEPTED) {
      throw new ForbiddenException('Parent account is not linked to this student');
    }
  }

  private async getStudentSummaryStats(studentId: string) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [attemptsThisWeek, reviewDue] = await Promise.all([
      this.prisma.attempt.findMany({
        where: {
          userId: studentId,
          status: { in: ['SUBMITTED', 'GRADED'] },
          submittedAt: { gte: weekAgo },
        },
        select: { totalScore: true, maxScore: true },
      }),
      this.prisma.reviewCard.count({
        where: { userId: studentId, nextReviewAt: { lte: new Date() } },
      }),
    ]);

    const scored = attemptsThisWeek.filter(
      (a) => a.totalScore !== null && a.maxScore && a.maxScore > 0,
    );
    const averageScore = scored.length
      ? scored.reduce((sum, a) => sum + (a.totalScore! / a.maxScore!) * 100, 0) /
        scored.length
      : 0;

    return {
      attemptsThisWeek: attemptsThisWeek.length,
      averageScore,
      reviewDueToday: reviewDue,
    };
  }

  private async getRecentAttempts(studentId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { userId: studentId, status: { in: ['SUBMITTED', 'GRADED'] } },
      include: { exam: { select: { title: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    });

    return attempts.map((attempt) => ({
      attemptId: attempt.id,
      examTitle: attempt.exam.title,
      score: attempt.totalScore,
      maxScore: attempt.maxScore,
      percentage:
        attempt.totalScore !== null && attempt.maxScore
          ? Math.round((attempt.totalScore / attempt.maxScore) * 100)
          : null,
      submittedAt: attempt.submittedAt,
    }));
  }

  private async getWeeklyProgress(studentId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const attempts = await this.prisma.attempt.findMany({
      where: {
        userId: studentId,
        status: { in: ['SUBMITTED', 'GRADED'] },
        submittedAt: { gte: start },
      },
      select: { submittedAt: true, totalScore: true, maxScore: true },
    });

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const date = day.toISOString().slice(0, 10);
      const dayAttempts = attempts.filter(
        (a) => a.submittedAt?.toISOString().slice(0, 10) === date,
      );
      const scored = dayAttempts.filter((a) => a.totalScore !== null && a.maxScore);
      const averageScore = scored.length
        ? scored.reduce((sum, a) => sum + (a.totalScore! / a.maxScore!) * 100, 0) /
          scored.length
        : 0;

      return { date, attemptsCount: dayAttempts.length, averageScore };
    });
  }

  private async getReviewStats(studentId: string) {
    const [dueToday, sessions] = await Promise.all([
      this.prisma.reviewCard.count({
        where: { userId: studentId, nextReviewAt: { lte: new Date() } },
      }),
      this.prisma.reviewSession.findMany({
        where: { userId: studentId },
        select: { reviewedAt: true },
        orderBy: { reviewedAt: 'desc' },
        take: 120,
      }),
    ]);

    return {
      dueToday,
      streakDays: this.calculateStreakDays(sessions.map((s) => s.reviewedAt)),
    };
  }

  private async getWeakTopics(studentId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { userId: studentId, status: { in: ['SUBMITTED', 'GRADED'] } },
      include: {
        exam: {
          include: {
            questions: {
              include: { question: { select: { tags: true } } },
            },
          },
        },
      },
    });

    const tagStats: Record<string, { correct: number; total: number }> = {};
    attempts.forEach((attempt) => {
      const answers = attempt.answers as any[];
      const tagsByQuestion = Object.fromEntries(
        attempt.exam.questions.map((eq) => [eq.questionId, eq.question.tags]),
      );

      answers.forEach((answer) => {
        const tags = tagsByQuestion[answer.questionId] ?? [];
        tags.forEach((tag: string) => {
          tagStats[tag] ??= { correct: 0, total: 0 };
          tagStats[tag].total++;
          if (answer.isCorrect) tagStats[tag].correct++;
        });
      });
    });

    return Object.entries(tagStats)
      .filter(([, stats]) => stats.total >= 2)
      .map(([tag, stats]) => ({ tag, rate: stats.correct / stats.total }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5)
      .map((item) => item.tag);
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
