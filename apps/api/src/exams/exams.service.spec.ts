import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExamsService } from './exams.service';

const mockPrisma = {
  exam: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  examQuestion: {
    upsert: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  attempt: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

describe('ExamsService', () => {
  let service: ExamsService;
  const teacherId = 'teacher-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExamsService(mockPrisma as any);
  });

  describe('create', () => {
    it('should create an exam with unique access code', async () => {
      mockPrisma.exam.findUnique
        .mockResolvedValueOnce(null); // access code check
      mockPrisma.exam.create.mockResolvedValue({
        id: 'exam-1',
        title: 'Test Exam',
        accessCode: 'ABC123',
        status: 'DRAFT',
        creatorId: teacherId,
      });

      const result = await service.create(teacherId, {
        title: 'Test Exam',
        description: 'A test exam',
        config: {},
      });

      expect(result.id).toBe('exam-1');
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.exam.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Exam',
            creatorId: teacherId,
            status: 'DRAFT',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated exams', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });
      mockPrisma.exam.findMany.mockResolvedValue([
        { id: 'exam-1', title: 'Exam 1' },
        { id: 'exam-2', title: 'Exam 2' },
      ]);
      mockPrisma.exam.count.mockResolvedValue(2);

      const result = await service.findAll(teacherId, { page: 1, limit: 20 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });
      mockPrisma.exam.findMany.mockResolvedValue([]);
      mockPrisma.exam.count.mockResolvedValue(0);

      await service.findAll(teacherId, { page: 1, limit: 10, status: 'PUBLISHED' as any });

      expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return exam with questions if user is owner', async () => {
      mockPrisma.exam.findUnique
        .mockResolvedValueOnce({ id: 'exam-1', creatorId: teacherId, organizationId: null })
        .mockResolvedValueOnce({
          id: 'exam-1',
          questions: [{ questionId: 'q1', question: { content: 'Q1' } }],
        });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });

      const result = await service.findOne('exam-1', teacherId);
      expect(result.id).toBe('exam-1');
    });

    it('should throw NotFoundException for missing exam', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', teacherId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for non-owner', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: 'other-teacher',
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });

      await expect(service.findOne('exam-1', teacherId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update a DRAFT exam', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: teacherId,
        status: 'DRAFT',
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });
      mockPrisma.exam.update.mockResolvedValue({
        id: 'exam-1',
        title: 'Updated Title',
      });

      const result = await service.update('exam-1', teacherId, { title: 'Updated Title' });
      expect(result.title).toBe('Updated Title');
    });

    it('should reject updates to PUBLISHED exams', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: teacherId,
        status: 'PUBLISHED',
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });

      await expect(
        service.update('exam-1', teacherId, { title: 'New Title' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publish', () => {
    it('should publish an exam with questions', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: teacherId,
        status: 'DRAFT',
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });
      mockPrisma.examQuestion.count.mockResolvedValue(5);
      mockPrisma.exam.update.mockResolvedValue({
        id: 'exam-1',
        status: 'PUBLISHED',
      });

      const result = await service.publish('exam-1', teacherId);
      expect(result.status).toBe('PUBLISHED');
    });

    it('should reject publishing exam with no questions', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: teacherId,
        status: 'DRAFT',
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });
      mockPrisma.examQuestion.count.mockResolvedValue(0);

      await expect(service.publish('exam-1', teacherId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('archive', () => {
    it('should archive an exam', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: teacherId,
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });
      mockPrisma.exam.update.mockResolvedValue({
        id: 'exam-1',
        status: 'ARCHIVED',
      });

      const result = await service.archive('exam-1', teacherId);
      expect(result.status).toBe('ARCHIVED');
    });
  });

  describe('findByAccessCode', () => {
    it('should find exam by code and hide accessCode', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        title: 'Test Exam',
        accessCode: 'ABC123',
        status: 'PUBLISHED',
        _count: { questions: 5 },
      });

      const result = await service.findByAccessCode('ABC123');
      expect(result).not.toHaveProperty('accessCode');
      expect(result.title).toBe('Test Exam');
    });

    it('should throw NotFoundException for invalid code', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(null);

      await expect(service.findByAccessCode('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getResults', () => {
    it('should return attempts for an exam', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        creatorId: teacherId,
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });
      mockPrisma.attempt.findMany.mockResolvedValue([
        { id: 'att-1', status: 'GRADED', totalScore: 80 },
        { id: 'att-2', status: 'SUBMITTED', totalScore: 65 },
      ]);

      const results = await service.getResults('exam-1', teacherId);
      expect(results).toHaveLength(2);
    });
  });
});
