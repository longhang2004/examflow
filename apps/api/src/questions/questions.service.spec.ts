import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuestionsService } from './questions.service';

const mockPrisma = {
  question: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  examQuestion: {
    findFirst: jest.fn(),
  },
};

describe('QuestionsService', () => {
  let service: QuestionsService;
  const teacherId = 'teacher-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuestionsService(mockPrisma as any);
  });

  describe('create', () => {
    it('should create a question with all fields', async () => {
      const dto = {
        type: 'MULTIPLE_CHOICE' as any,
        content: 'What is 2+2?',
        config: { options: ['3', '4', '5'], correctAnswer: '4' },
        tags: ['math', 'basic'],
        difficulty: 1,
        isPublic: true,
      };

      mockPrisma.question.create.mockResolvedValue({
        id: 'q1',
        creatorId: teacherId,
        ...dto,
      });

      const result = await service.create(teacherId, dto);
      expect(result.id).toBe('q1');
      expect(result.creatorId).toBe(teacherId);
      expect(mockPrisma.question.create).toHaveBeenCalledWith({
        data: {
          creatorId: teacherId,
          type: dto.type,
          content: dto.content,
          config: dto.config,
          tags: dto.tags,
          difficulty: dto.difficulty,
          isPublic: dto.isPublic,
          organizationId: undefined,
        },
      });
    });

    it('should default tags to empty array', async () => {
      const dto = {
        type: 'TRUE_FALSE' as any,
        content: 'The sky is blue',
        config: { correctAnswer: true },
      };

      mockPrisma.question.create.mockResolvedValue({ id: 'q2', ...dto, tags: [] });
      await service.create(teacherId, dto);

      expect(mockPrisma.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tags: [] }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });
      mockPrisma.question.findMany.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);
      mockPrisma.question.count.mockResolvedValue(2);

      const result = await service.findAll(teacherId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should filter by type and difficulty', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });
      mockPrisma.question.findMany.mockResolvedValue([]);
      mockPrisma.question.count.mockResolvedValue(0);

      await service.findAll(teacherId, {
        page: 1,
        limit: 10,
        type: 'ESSAY' as any,
        difficulty: 3,
      });

      expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'ESSAY',
            difficulty: 3,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return question if user is creator', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        creatorId: teacherId,
        isPublic: false,
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });

      const result = await service.findOne('q1', teacherId);
      expect(result.id).toBe('q1');
    });

    it('should throw NotFoundException for missing question', async () => {
      mockPrisma.question.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', teacherId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        creatorId: 'other-user',
        isPublic: false,
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });

      await expect(service.findOne('q1', teacherId)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to public questions', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        creatorId: 'other-user',
        isPublic: true,
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });

      const result = await service.findOne('q1', teacherId);
      expect(result.id).toBe('q1');
    });
  });

  describe('update', () => {
    it('should update question if user is creator', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        creatorId: teacherId,
        isPublic: false,
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: teacherId,
        role: 'TEACHER',
        organizationId: null,
      });
      mockPrisma.question.update.mockResolvedValue({ id: 'q1', content: 'Updated' });

      const result = await service.update('q1', teacherId, { content: 'Updated' });
      expect(result.content).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete question if not used in published exam', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        creatorId: teacherId,
        isPublic: false,
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });
      mockPrisma.examQuestion.findFirst.mockResolvedValue(null);
      mockPrisma.question.delete.mockResolvedValue({ id: 'q1' });

      await service.remove('q1', teacherId);
      expect(mockPrisma.question.delete).toHaveBeenCalledWith({ where: { id: 'q1' } });
    });

    it('should forbid deletion if used in published exam', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        creatorId: teacherId,
        isPublic: false,
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });
      mockPrisma.examQuestion.findFirst.mockResolvedValue({ id: 'eq1' });

      await expect(service.remove('q1', teacherId)).rejects.toThrow(ForbiddenException);
    });

    it('should forbid deletion by non-creator', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 'q1',
        creatorId: 'other-user',
        isPublic: true,
        organizationId: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: teacherId, organizationId: null });

      await expect(service.remove('q1', teacherId)).rejects.toThrow(ForbiddenException);
    });
  });
});
