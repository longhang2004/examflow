import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @ApiOperation({ summary: 'Health check — verifies DB and Redis connectivity' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  @Get()
  async check() {
    let database = 'connected';
    let redisStatus = 'connected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'disconnected';
    }

    try {
      await this.redis.set('health', 'ok', 10);
    } catch {
      redisStatus = 'disconnected';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database,
      redis: redisStatus,
    };
  }
}
