import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

const mockPrisma = {
  exam: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  attempt: {
    findMany: jest.fn(),
  },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const teacherId = 'teacher-1';
  const studentId = 'student-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(mockPrisma as any);
  });

  describe('getExamStats', () => {
    it('should return analytics for an exam with attempts', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: teacherId,
        organizationId: null,
        questions: [
          {
            questionId: 'q1',
            question: { content: 'What is 2+2?' },
          },
          {
            questionId: 'q2',
            question: { content: 'True or false?' },
          },
        ],
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });

      mockPrisma.attempt.findMany.mockResolvedValue([
        {
          id: 'att-1',
          status: 'GRADED',
          totalScore: 15,
          maxScore: 15,
          answers: [
            { questionId: 'q1', isCorrect: true, timeSpent: 20 },
            { questionId: 'q2', isCorrect: true, timeSpent: 10 },
          ],
        },
        {
          id: 'att-2',
          status: 'GRADED',
          totalScore: 10,
          maxScore: 15,
          answers: [
            { questionId: 'q1', isCorrect: true, timeSpent: 25 },
            { questionId: 'q2', isCorrect: false, timeSpent: 15 },
          ],
        },
      ]);

      const result = await service.getExamStats('exam-1', teacherId);

      expect(result.totalAttempts).toBe(2);
      expect(result.averageScore).toBeCloseTo(83.33, 1);
      expect(result.highestScore).toBe(100);
      expect(result.lowestScore).toBeCloseTo(66.67, 1);
      expect(result.passRate).toBe(1);
      expect(result.questionStats).toHaveLength(2);
      expect(result.scoreDistribution).toHaveLength(10);

      const q1Stats = result.questionStats.find((q) => q.questionId === 'q1');
      expect(q1Stats.correctRate).toBe(1);
      expect(q1Stats.averageTimeSpent).toBe(22.5);
    });

    it('should return zeros when no attempts exist', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: teacherId,
        organizationId: null,
        questions: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });
      mockPrisma.attempt.findMany.mockResolvedValue([]);

      const result = await service.getExamStats('exam-1', teacherId);
      expect(result.totalAttempts).toBe(0);
      expect(result.averageScore).toBe(0);
    });

    it('should throw NotFoundException for missing exam', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(null);

      await expect(service.getExamStats('nonexistent', teacherId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: 'other-teacher',
        organizationId: null,
        questions: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });

      await expect(service.getExamStats('exam-1', teacherId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMyStats', () => {
    it('should return student stats with weak topics', async () => {
      mockPrisma.attempt.findMany.mockResolvedValue([
        {
          id: 'att-1',
          totalScore: 8,
          maxScore: 15,
          submittedAt: new Date(),
          answers: [
            { questionId: 'q1', isCorrect: true },
            { questionId: 'q2', isCorrect: false },
            { questionId: 'q3', isCorrect: false },
          ],
          exam: {
            title: 'Math Exam',
            questions: [
              { questionId: 'q1', question: { tags: ['algebra', 'basic'] } },
              { questionId: 'q2', question: { tags: ['geometry'] } },
              { questionId: 'q3', question: { tags: ['geometry', 'advanced'] } },
            ],
          },
        },
        {
          id: 'att-2',
          totalScore: 12,
          maxScore: 15,
          submittedAt: new Date(),
          answers: [
            { questionId: 'q1', isCorrect: true },
            { questionId: 'q2', isCorrect: false },
            { questionId: 'q3', isCorrect: true },
          ],
          exam: {
            title: 'Math Exam 2',
            questions: [
              { questionId: 'q1', question: { tags: ['algebra'] } },
              { questionId: 'q2', question: { tags: ['geometry'] } },
              { questionId: 'q3', question: { tags: ['algebra', 'advanced'] } },
            ],
          },
        },
      ]);

      const result = await service.getMyStats(studentId);

      expect(result.totalAttempts).toBe(2);
      expect(result.completedAttempts).toBe(2);
      expect(result.averageScore).toBeCloseTo(66.67, 1);
      expect(result.recentAttempts).toHaveLength(2);
      expect(result.weakTopics.length).toBeGreaterThanOrEqual(1);
      expect(result.weakTopics).toContain('geometry');
    });

    it('should return empty stats for user with no attempts', async () => {
      mockPrisma.attempt.findMany.mockResolvedValue([]);

      const result = await service.getMyStats(studentId);
      expect(result.totalAttempts).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.weakTopics).toHaveLength(0);
      expect(result.recentAttempts).toHaveLength(0);
    });
  });
});
