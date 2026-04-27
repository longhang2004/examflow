import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AntiCheatService } from './anticheat.service';

const mockPrisma = {
  attempt: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockRedis = {
  exists: jest.fn(),
  ttl: jest.fn(),
};

describe('AntiCheatService', () => {
  let service: AntiCheatService;

  const inProgressAttempt = {
    id: 'attempt-1',
    userId: 'student-1',
    status: 'IN_PROGRESS',
    tabSwitchCount: 0,
    tabSwitchLog: [],
    fullscreenExits: 0,
    fullscreenLog: [],
    warningCount: 0,
    isFlagged: false,
    flagReason: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AntiCheatService(mockPrisma as any, mockRedis as any);
  });

  describe('recordTabSwitch', () => {
    it('records a low-severity tab switch without flagging', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(inProgressAttempt);
      mockPrisma.attempt.update.mockResolvedValue({});

      const result = await service.recordTabSwitch(
        'attempt-1',
        'student-1',
        '2026-04-27T00:00:00.000Z',
      );

      expect(result).toEqual({
        tabSwitchCount: 1,
        warningCount: 0,
        isFlagged: false,
        shouldAutoSubmit: false,
      });
      expect(mockPrisma.attempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-1' },
        data: expect.objectContaining({
          tabSwitchCount: 1,
          tabSwitchLog: [{ timestamp: '2026-04-27T00:00:00.000Z', count: 1 }],
          warningCount: 0,
          isFlagged: false,
        }),
      });
    });

    it('flags the attempt at 5 tab switches', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        ...inProgressAttempt,
        tabSwitchCount: 4,
        warningCount: 1,
        tabSwitchLog: [{ timestamp: 'earlier', count: 4 }],
      });
      mockPrisma.attempt.update.mockResolvedValue({});

      const result = await service.recordTabSwitch(
        'attempt-1',
        'student-1',
        '2026-04-27T00:01:00.000Z',
      );

      expect(result.isFlagged).toBe(true);
      expect(result.shouldAutoSubmit).toBe(false);
      expect(mockPrisma.attempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-1' },
        data: expect.objectContaining({
          tabSwitchCount: 5,
          warningCount: 2,
          isFlagged: true,
          flagReason: 'Rời khỏi trang thi 5 lần',
        }),
      });
    });

    it('requests auto-submit at 10 tab switches', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        ...inProgressAttempt,
        tabSwitchCount: 9,
        warningCount: 6,
        isFlagged: true,
        flagReason: 'Rời khỏi trang thi 5 lần',
      });
      mockPrisma.attempt.update.mockResolvedValue({});

      const result = await service.recordTabSwitch(
        'attempt-1',
        'student-1',
        '2026-04-27T00:02:00.000Z',
      );

      expect(result.tabSwitchCount).toBe(10);
      expect(result.shouldAutoSubmit).toBe(true);
    });

    it('rejects missing, wrong-owner, and submitted attempts', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.recordTabSwitch('missing', 'student-1', 'now'),
      ).rejects.toThrow(NotFoundException);

      mockPrisma.attempt.findUnique.mockResolvedValueOnce({
        ...inProgressAttempt,
        userId: 'other-student',
      });
      await expect(
        service.recordTabSwitch('attempt-1', 'student-1', 'now'),
      ).rejects.toThrow(ForbiddenException);

      mockPrisma.attempt.findUnique.mockResolvedValueOnce({
        ...inProgressAttempt,
        status: 'GRADED',
      });
      await expect(
        service.recordTabSwitch('attempt-1', 'student-1', 'now'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordFullscreenExit', () => {
    it('increments warning count from the third fullscreen exit', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        ...inProgressAttempt,
        fullscreenExits: 2,
        warningCount: 0,
      });
      mockPrisma.attempt.update.mockResolvedValue({});

      const result = await service.recordFullscreenExit(
        'attempt-1',
        'student-1',
        '2026-04-27T00:03:00.000Z',
        4200,
      );

      expect(result).toEqual({
        fullscreenExits: 3,
        warningCount: 1,
        isFlagged: false,
      });
      expect(mockPrisma.attempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-1' },
        data: expect.objectContaining({
          fullscreenExits: 3,
          fullscreenLog: [{ timestamp: '2026-04-27T00:03:00.000Z', duration: 4200 }],
          warningCount: 1,
        }),
      });
    });

    it('flags after 5 fullscreen exits', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        ...inProgressAttempt,
        fullscreenExits: 4,
        warningCount: 2,
      });
      mockPrisma.attempt.update.mockResolvedValue({});

      const result = await service.recordFullscreenExit(
        'attempt-1',
        'student-1',
        '2026-04-27T00:04:00.000Z',
        1000,
      );

      expect(result.isFlagged).toBe(true);
      expect(mockPrisma.attempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-1' },
        data: expect.objectContaining({
          fullscreenExits: 5,
          flagReason: 'Thoát toàn màn hình 5 lần',
        }),
      });
    });
  });

  describe('checkTimerValidity', () => {
    it('returns expired when a timed attempt has no Redis timer', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        ...inProgressAttempt,
        exam: { config: { duration: 30 } },
      });
      mockRedis.exists.mockResolvedValue(0);

      await expect(service.checkTimerValidity('attempt-1', 'student-1')).resolves.toEqual({
        expired: true,
        remainingSeconds: 0,
      });
    });

    it('returns remaining seconds from Redis TTL', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        ...inProgressAttempt,
        exam: { config: { duration: 30 } },
      });
      mockRedis.exists.mockResolvedValue(1);
      mockRedis.ttl.mockResolvedValue(123);

      await expect(service.checkTimerValidity('attempt-1', 'student-1')).resolves.toEqual({
        expired: false,
        remainingSeconds: 123,
      });
    });
  });
});
