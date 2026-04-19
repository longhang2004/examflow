import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getExamStats(examId: string, requesterId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) throw new NotFoundException('Exam not found');

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    const isOwner = exam.creatorId === requesterId;
    const isOrgAdmin =
      requester?.role === Role.ORG_ADMIN && exam.organizationId === requester.organizationId;

    if (!isOwner && !isOrgAdmin) {
      throw new ForbiddenException('Access denied');
    }

    const attempts = await this.prisma.attempt.findMany({
      where: { examId, status: { in: ['SUBMITTED', 'GRADED'] } },
    });

    const totalAttempts = attempts.length;
    const completedAttempts = attempts.length;

    if (totalAttempts === 0) {
      return {
        examId,
        totalAttempts: 0,
        completedAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        scoreDistribution: [],
        questionStats: [],
      };
    }

    const scores = attempts
      .filter((a) => a.totalScore !== null && a.maxScore !== null && a.maxScore > 0)
      .map((a) => (a.totalScore! / a.maxScore!) * 100);

    const averageScore = scores.reduce((s, v) => s + v, 0) / (scores.length || 1);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passRate = scores.filter((s) => s >= 60).length / (scores.length || 1);

    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}%`,
      count: 0,
    }));
    scores.forEach((s) => {
      const idx = Math.min(Math.floor(s / 10), 9);
      buckets[idx].count++;
    });

    const questionStats = exam.questions.map((eq) => {
      const questionId = eq.questionId;
      let totalAnswered = 0;
      let correctCount = 0;
      let totalTime = 0;

      attempts.forEach((a) => {
        const answers = a.answers as any[];
        const ans = answers.find((x) => x.questionId === questionId);
        if (ans) {
          totalAnswered++;
          if (ans.isCorrect) correctCount++;
          totalTime += ans.timeSpent ?? 0;
        }
      });

      return {
        questionId,
        content: eq.question.content.substring(0, 50),
        totalAnswered,
        correctCount,
        correctRate: totalAnswered > 0 ? correctCount / totalAnswered : 0,
        averageTimeSpent: totalAnswered > 0 ? totalTime / totalAnswered : 0,
      };
    });

    return {
      examId,
      totalAttempts,
      completedAttempts,
      averageScore,
      highestScore,
      lowestScore,
      passRate,
      scoreDistribution: buckets,
      questionStats,
    };
  }

  async getMyStats(userId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { userId, status: { in: ['SUBMITTED', 'GRADED'] } },
      include: {
        exam: {
          select: {
            title: true,
            questions: {
              include: { question: { select: { tags: true } } },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter((a) => a.submittedAt).length;

    const scores = attempts
      .filter((a) => a.totalScore !== null && a.maxScore && a.maxScore > 0)
      .map((a) => (a.totalScore! / a.maxScore!) * 100);

    const averageScore = scores.length
      ? scores.reduce((s, v) => s + v, 0) / scores.length
      : 0;

    const recentAttempts = attempts.slice(0, 10).map((a) => ({
      attemptId: a.id,
      examTitle: a.exam.title,
      score: a.totalScore,
      maxScore: a.maxScore,
      submittedAt: a.submittedAt,
    }));

    const tagCorrectness: Record<string, { correct: number; total: number }> = {};
    attempts.forEach((a) => {
      const answers = a.answers as any[];
      const questionTagMap: Record<string, string[]> = {};
      a.exam.questions.forEach((eq) => {
        questionTagMap[eq.questionId] = eq.question.tags;
      });

      answers.forEach((ans) => {
        const tags = questionTagMap[ans.questionId] ?? [];
        tags.forEach((tag) => {
          if (!tagCorrectness[tag]) tagCorrectness[tag] = { correct: 0, total: 0 };
          tagCorrectness[tag].total++;
          if (ans.isCorrect) tagCorrectness[tag].correct++;
        });
      });
    });

    const weakTopics = Object.entries(tagCorrectness)
      .filter(([, v]) => v.total >= 2)
      .map(([tag, v]) => ({ tag, correctRate: v.correct / v.total }))
      .sort((a, b) => a.correctRate - b.correctRate)
      .slice(0, 5)
      .map((t) => t.tag);

    return {
      totalAttempts,
      completedAttempts,
      averageScore,
      recentAttempts,
      weakTopics,
    };
  }
}
