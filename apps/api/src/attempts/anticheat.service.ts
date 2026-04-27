import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttemptStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AntiCheatService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async recordTabSwitch(attemptId: string, userId: string, timestamp: string) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress');
    }

    const tabSwitchCount = attempt.tabSwitchCount + 1;
    const tabSwitchLog = [...(attempt.tabSwitchLog as any[]), { timestamp, count: tabSwitchCount }];

    let warningCount = attempt.warningCount;
    if (tabSwitchCount >= 3) {
      warningCount++;
    }

    let isFlagged = attempt.isFlagged;
    let flagReason = attempt.flagReason;
    if (tabSwitchCount >= 5 && !isFlagged) {
      isFlagged = true;
      flagReason = 'Rời khỏi trang thi 5 lần';
    }

    const shouldAutoSubmit = isFlagged && tabSwitchCount >= 10;

    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        tabSwitchCount,
        tabSwitchLog,
        warningCount,
        isFlagged,
        flagReason,
      },
    });

    return { tabSwitchCount, warningCount, isFlagged, shouldAutoSubmit };
  }

  async recordFullscreenExit(
    attemptId: string,
    userId: string,
    timestamp: string,
    durationMs: number,
  ) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException();
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt is not in progress');
    }

    const fullscreenExits = attempt.fullscreenExits + 1;
    const fullscreenLog = [
      ...(attempt.fullscreenLog as any[]),
      { timestamp, duration: durationMs },
    ];

    let warningCount = attempt.warningCount;
    if (fullscreenExits >= 3) {
      warningCount++;
    }

    let isFlagged = attempt.isFlagged;
    let flagReason = attempt.flagReason;
    if (fullscreenExits >= 5 && !isFlagged) {
      isFlagged = true;
      flagReason = 'Thoát toàn màn hình 5 lần';
    }

    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        fullscreenExits,
        fullscreenLog,
        warningCount,
        isFlagged,
        flagReason,
      },
    });

    return { fullscreenExits, warningCount, isFlagged };
  }

  async getAntiCheatReport(attemptId: string, requesterId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: true,
        user: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    const isOwner = attempt.exam.creatorId === requesterId;
    const isOrgAdmin =
      requester?.role === Role.ORG_ADMIN &&
      attempt.exam.organizationId === requester.organizationId;

    if (!isOwner && !isOrgAdmin && requester?.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    return {
      attemptId: attempt.id,
      student: attempt.user,
      tabSwitchCount: attempt.tabSwitchCount,
      tabSwitchLog: attempt.tabSwitchLog,
      fullscreenExits: attempt.fullscreenExits,
      fullscreenLog: attempt.fullscreenLog,
      warningCount: attempt.warningCount,
      isFlagged: attempt.isFlagged,
      flagReason: attempt.flagReason,
    };
  }

  async checkTimerValidity(attemptId: string, requesterId?: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (requesterId && attempt.userId !== requesterId) {
      throw new ForbiddenException();
    }

    const config = attempt.exam.config as any;
    if (!config?.duration) {
      return { expired: false, remainingSeconds: null };
    }

    const timerKey = `attempt:${attemptId}:timer`;
    const exists = await this.redis.exists(timerKey);

    if (!exists) {
      return { expired: true, remainingSeconds: 0 };
    }

    const ttl = await this.redis.ttl(timerKey);
    return { expired: false, remainingSeconds: Math.max(0, ttl) };
  }
}
