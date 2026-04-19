import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get exam statistics and question analysis' })
  @ApiResponse({ status: 200, description: 'Exam stats with score distribution and per-question metrics' })
  @ApiResponse({ status: 403, description: 'Only exam creator or org admin can view' })
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Get('exams/:examId')
  getExamStats(@CurrentUser() user: any, @Param('examId') examId: string) {
    return this.analyticsService.getExamStats(examId, user.id);
  }

  @ApiOperation({ summary: 'Get personal learning statistics' })
  @ApiResponse({ status: 200, description: 'User stats with recent attempts and weak topics' })
  @Get('me')
  getMyStats(@CurrentUser() user: any) {
    return this.analyticsService.getMyStats(user.id);
  }
}
