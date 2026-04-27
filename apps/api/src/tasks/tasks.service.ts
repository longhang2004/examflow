import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttemptsService } from '../attempts/attempts.service';
import { AntiCheatService } from '../attempts/anticheat.service';
import { AttemptStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private attemptsService: AttemptsService,
    private antiCheatService: AntiCheatService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredAttempts() {
    const inProgressAttempts = await this.prisma.attempt.findMany({
      where: { status: AttemptStatus.IN_PROGRESS },
      include: { exam: true },
    });

    let autoSubmittedCount = 0;

    for (const attempt of inProgressAttempts) {
      const config = attempt.exam.config as any;
      if (!config?.duration) continue;

      try {
        const timerStatus = await this.antiCheatService.checkTimerValidity(attempt.id);
        if (timerStatus.expired) {
          await this.attemptsService.submitInternal(attempt.id);
          autoSubmittedCount++;
          this.logger.log(`Auto-submitted expired attempt ${attempt.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to auto-submit attempt ${attempt.id}: ${error.message}`);
      }
    }

    if (autoSubmittedCount > 0) {
      this.logger.log(`Auto-submitted ${autoSubmittedCount} expired attempt(s)`);
    }
  }
}
