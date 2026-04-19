import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AttemptsService } from './attempts.service';

const mockPrisma = {
  exam: {
    findUnique: jest.fn(),
  },
  attempt: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  examQuestion: {
    findMany: jest.fn(),
  },
};

const mockRedis = {
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
};

const mockGrading = {
  gradeAttempt: jest.fn(),
};

describe('AttemptsService', () => {
  let service: AttemptsService;
  const studentId = 'student-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttemptsService(
      mockPrisma as any,
      mockRedis as any,
      mockGrading as any,
    );
  });

  describe('start', () => {
    const publishedExam = {
      id: 'exam-1',
      status: 'PUBLISHED',
      accessCode: 'ABC123',
      config: { maxAttempts: 2, shuffleQuestions: false, shuffleOptions: false, duration: null },
      questions: [
        { questionId: 'q1', point: 10, question: { type: 'MULTIPLE_CHOICE', config: {} } },
        { questionId: 'q2', point: 5, question: { type: 'TRUE_FALSE', config: {} } },
      ],
    };

    it('should create a new attempt for a published exam', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(publishedExam);
      mockPrisma.attempt.findMany.mockResolvedValue([]);
      mockPrisma.attempt.create.mockResolvedValue({
        id: 'att-1',
        examId: 'exam-1',
        userId: studentId,
        status: 'IN_PROGRESS',
        questionOrder: ['q1', 'q2'],
        maxScore: 15,
        answers: [],
      });

      const result = await service.start(studentId, {
        examId: 'exam-1',
        accessCode: 'ABC123',
      });

      expect(result.attempt.id).toBe('att-1');
      expect(result.attempt.status).toBe('IN_PROGRESS');
      expect(result.attempt.maxScore).toBe(15);
      expect(result.questions).toHaveLength(2);
    });

    it('should return existing in-progress attempt', async () => {
      const existingAttempt = {
        id: 'att-existing',
        status: 'IN_PROGRESS',
        examId: 'exam-1',
        userId: studentId,
      };
      mockPrisma.exam.findUnique.mockResolvedValue(publishedExam);
      mockPrisma.attempt.findMany.mockResolvedValue([existingAttempt]);
      mockPrisma.examQuestion.findMany.mockResolvedValue(publishedExam.questions);

      const result = await service.start(studentId, {
        examId: 'exam-1',
        accessCode: 'ABC123',
      });

      expect(result.attempt.id).toBe('att-existing');
      expect(mockPrisma.attempt.create).not.toHaveBeenCalled();
    });

    it('should reject if exam is not published', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({ ...publishedExam, status: 'DRAFT' });

      await expect(
        service.start(studentId, { examId: 'exam-1', accessCode: 'ABC123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if max attempts reached', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(publishedExam);
      mockPrisma.attempt.findMany.mockResolvedValue([
        { status: 'GRADED' },
        { status: 'GRADED' },
      ]);

      await expect(
        service.start(studentId, { examId: 'exam-1', accessCode: 'ABC123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid access code', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(publishedExam);

      await expect(
        service.start(studentId, { examId: 'exam-1', accessCode: 'WRONG' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if exam not found', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(null);

      await expect(
        service.start(studentId, { examId: 'nonexistent', accessCode: '' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set timer in Redis for timed exams', async () => {
      const timedExam = {
        ...publishedExam,
        config: { ...publishedExam.config, duration: 30 },
      };
      mockPrisma.exam.findUnique.mockResolvedValue(timedExam);
      mockPrisma.attempt.findMany.mockResolvedValue([]);
      mockPrisma.attempt.create.mockResolvedValue({
        id: 'att-timed',
        status: 'IN_PROGRESS',
        questionOrder: ['q1', 'q2'],
        maxScore: 15,
        answers: [],
      });

      await service.start(studentId, { examId: 'exam-1', accessCode: 'ABC123' });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'attempt:att-timed:timer',
        expect.any(String),
        1800,
      );
    });
  });

  describe('saveAnswer', () => {
    const inProgressAttempt = {
      id: 'att-1',
      userId: studentId,
      status: 'IN_PROGRESS',
      examId: 'exam-1',
      questionOrder: ['q1', 'q2'],
      answers: [],
    };

    it('should save a new answer', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(inProgressAttempt);
      mockRedis.exists.mockResolvedValue(true);
      mockPrisma.exam.findUnique.mockResolvedValue({ config: { duration: 30 } });
      mockPrisma.attempt.update.mockResolvedValue({
        ...inProgressAttempt,
        answers: [{ questionId: 'q1', answer: 'b', timeSpent: 10 }],
      });

      const result = await service.saveAnswer(studentId, 'att-1', {
        questionId: 'q1',
        answer: 'b',
        timeSpent: 10,
      });

      expect(mockPrisma.attempt.update).toHaveBeenCalled();
    });

    it('should update an existing answer', async () => {
      const attemptWithAnswer = {
        ...inProgressAttempt,
        answers: [{ questionId: 'q1', answer: 'a', timeSpent: 5 }],
      };
      mockPrisma.attempt.findUnique.mockResolvedValue(attemptWithAnswer);
      mockRedis.exists.mockResolvedValue(true);
      mockPrisma.exam.findUnique.mockResolvedValue({ config: { duration: 30 } });
      mockPrisma.attempt.update.mockResolvedValue({
        ...attemptWithAnswer,
        answers: [{ questionId: 'q1', answer: 'b', timeSpent: 15 }],
      });

      await service.saveAnswer(studentId, 'att-1', {
        questionId: 'q1',
        answer: 'b',
        timeSpent: 15,
      });

      expect(mockPrisma.attempt.update).toHaveBeenCalled();
    });

    it('should reject if attempt not found', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(null);

      await expect(
        service.saveAnswer(studentId, 'nonexistent', {
          questionId: 'q1',
          answer: 'b',
          timeSpent: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if user is not the attempt owner', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        ...inProgressAttempt,
        userId: 'other-user',
      });

      await expect(
        service.saveAnswer(studentId, 'att-1', {
          questionId: 'q1',
          answer: 'b',
          timeSpent: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if attempt is already submitted', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        ...inProgressAttempt,
        status: 'SUBMITTED',
      });

      await expect(
        service.saveAnswer(studentId, 'att-1', {
          questionId: 'q1',
          answer: 'b',
          timeSpent: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if question not in attempt', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(inProgressAttempt);
      mockRedis.exists.mockResolvedValue(true);
      mockPrisma.exam.findUnique.mockResolvedValue({ config: { duration: 30 } });

      await expect(
        service.saveAnswer(studentId, 'att-1', {
          questionId: 'q99',
          answer: 'x',
          timeSpent: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit', () => {
    it('should grade and submit an attempt (auto-graded)', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: studentId,
        status: 'IN_PROGRESS',
        examId: 'exam-1',
        answers: [
          { questionId: 'q1', answer: 'b', timeSpent: 10 },
          { questionId: 'q2', answer: true, timeSpent: 5 },
        ],
      });

      mockPrisma.examQuestion.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          point: 10,
          question: { type: 'MULTIPLE_CHOICE', config: { correctAnswer: 'b' } },
        },
        {
          questionId: 'q2',
          point: 5,
          question: { type: 'TRUE_FALSE', config: { correctAnswer: true } },
        },
      ]);

      mockGrading.gradeAttempt.mockReturnValue([
        { questionId: 'q1', answer: 'b', isCorrect: true, pointEarned: 10, timeSpent: 10 },
        { questionId: 'q2', answer: true, isCorrect: true, pointEarned: 5, timeSpent: 5 },
      ]);

      mockPrisma.attempt.update.mockResolvedValue({
        id: 'att-1',
        status: 'GRADED',
        totalScore: 15,
      });

      const result = await service.submit(studentId, 'att-1');
      expect(result.status).toBe('GRADED');
      expect(result.totalScore).toBe(15);
      expect(mockRedis.del).toHaveBeenCalledWith('attempt:att-1:timer');
    });

    it('should set SUBMITTED status when essay present', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'att-2',
        userId: studentId,
        status: 'IN_PROGRESS',
        examId: 'exam-1',
        answers: [{ questionId: 'q1', answer: 'Essay text', timeSpent: 120 }],
      });

      mockPrisma.examQuestion.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          point: 20,
          question: { type: 'ESSAY', config: {} },
        },
      ]);

      mockGrading.gradeAttempt.mockReturnValue([
        { questionId: 'q1', answer: 'Essay text', isCorrect: null, pointEarned: null, timeSpent: 120 },
      ]);

      mockPrisma.attempt.update.mockResolvedValue({
        id: 'att-2',
        status: 'SUBMITTED',
        totalScore: 0,
      });

      const result = await service.submit(studentId, 'att-2');
      expect(result.status).toBe('SUBMITTED');
    });

    it('should reject if already submitted', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: studentId,
        status: 'GRADED',
      });

      await expect(service.submit(studentId, 'att-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should sanitize answers for in-progress attempt', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: studentId,
        status: 'IN_PROGRESS',
        answers: [
          { questionId: 'q1', answer: 'b', timeSpent: 10, isCorrect: true, pointEarned: 10 },
        ],
        exam: { config: {} },
      });

      const result = await service.findOne(studentId, 'att-1');
      expect(result.answers[0]).not.toHaveProperty('isCorrect');
      expect(result.answers[0]).not.toHaveProperty('pointEarned');
    });

    it('should throw if attempt not found', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(null);

      await expect(service.findOne(studentId, 'none')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for wrong user', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'att-1',
        userId: 'other-user',
        status: 'IN_PROGRESS',
      });

      await expect(service.findOne(studentId, 'att-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findMyAttempts', () => {
    it('should return user attempts', async () => {
      mockPrisma.attempt.findMany.mockResolvedValue([
        { id: 'att-1', examId: 'exam-1', status: 'GRADED', totalScore: 80 },
      ]);

      const result = await service.findMyAttempts(studentId);
      expect(result).toHaveLength(1);
      expect(mockPrisma.attempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: studentId },
        }),
      );
    });

    it('should filter by examId when provided', async () => {
      mockPrisma.attempt.findMany.mockResolvedValue([]);

      await service.findMyAttempts(studentId, 'exam-1');
      expect(mockPrisma.attempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: studentId, examId: 'exam-1' },
        }),
      );
    });
  });
});
