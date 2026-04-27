import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { AntiCheatService } from './anticheat.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { GradeAttemptDto } from './dto/grade-answer.dto';
import { TabSwitchEventDto, FullscreenExitEventDto } from './dto/anticheat-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attempts')
export class AttemptsController {
  constructor(
    private attemptsService: AttemptsService,
    private antiCheatService: AntiCheatService,
  ) {}

  @ApiOperation({ summary: 'Start an exam attempt' })
  @ApiResponse({ status: 201, description: 'Attempt started with questions' })
  @ApiResponse({ status: 400, description: 'Max attempts reached or exam not available' })
  @Post()
  start(@CurrentUser() user: any, @Body() dto: StartAttemptDto) {
    return this.attemptsService.start(user.id, dto);
  }

  @ApiOperation({ summary: 'Save an answer (auto-save)' })
  @ApiResponse({ status: 200, description: 'Answer saved' })
  @Put(':id/answers')
  saveAnswer(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.attemptsService.saveAnswer(user.id, id, dto);
  }

  @ApiOperation({ summary: 'Submit an attempt for grading' })
  @ApiResponse({ status: 201, description: 'Attempt graded and submitted' })
  @Post(':id/submit')
  submit(@CurrentUser() user: any, @Param('id') id: string) {
    return this.attemptsService.submit(user.id, id);
  }

  @ApiOperation({ summary: 'Get attempt details' })
  @ApiResponse({ status: 200, description: 'Attempt with answers (answers filtered by status)' })
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.attemptsService.findOne(user.id, id);
  }

  @ApiOperation({ summary: 'List my attempts' })
  @ApiResponse({ status: 200, description: 'List of attempts' })
  @Get()
  findMyAttempts(@CurrentUser() user: any, @Query('examId') examId?: string) {
    return this.attemptsService.findMyAttempts(user.id, examId);
  }

  @ApiOperation({ summary: 'Review a student attempt (teacher only)' })
  @ApiResponse({ status: 200, description: 'Full attempt with questions and answers' })
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ORG_ADMIN)
  @Get(':id/review')
  reviewAttempt(@CurrentUser() user: any, @Param('id') id: string) {
    return this.attemptsService.reviewAttempt(user.id, id);
  }

  @ApiOperation({ summary: 'Grade essay/text answers manually (teacher only)' })
  @ApiResponse({ status: 200, description: 'Answers graded, status updated if fully graded' })
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ORG_ADMIN)
  @Patch(':id/grade')
  gradeAttempt(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: GradeAttemptDto,
  ) {
    return this.attemptsService.gradeAttempt(user.id, id, dto);
  }

  // --- Anti-cheat endpoints ---

  @ApiTags('Anti-cheat')
  @ApiOperation({ summary: 'Record a tab switch event' })
  @ApiResponse({ status: 201, description: 'Tab switch recorded, returns warning status' })
  @Post(':id/events/tab-switch')
  async recordTabSwitch(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: TabSwitchEventDto,
  ) {
    const result = await this.antiCheatService.recordTabSwitch(id, user.id, dto.timestamp);

    let warning: string | null = null;
    if (result.tabSwitchCount >= 5) {
      warning = 'Vi phạm quy định: Bài thi sẽ bị nộp tự động nếu tiếp tục';
    } else if (result.tabSwitchCount >= 3) {
      warning = 'Cảnh báo nghiêm trọng: Bài thi của bạn đang bị theo dõi';
    } else if (result.tabSwitchCount >= 1) {
      warning = `Cảnh báo: Bạn đã rời khỏi trang thi (lần ${result.tabSwitchCount})`;
    }

    let autoSubmitted = false;
    if (result.shouldAutoSubmit) {
      await this.attemptsService.submitInternal(id);
      autoSubmitted = true;
    }

    return { warning, autoSubmitted, ...result };
  }

  @ApiTags('Anti-cheat')
  @ApiOperation({ summary: 'Record a fullscreen exit event' })
  @ApiResponse({ status: 201, description: 'Fullscreen exit recorded' })
  @Post(':id/events/fullscreen-exit')
  async recordFullscreenExit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: FullscreenExitEventDto,
  ) {
    return this.antiCheatService.recordFullscreenExit(id, user.id, dto.timestamp, dto.durationMs);
  }

  @ApiTags('Anti-cheat')
  @ApiOperation({ summary: 'Get anti-cheat report for an attempt (teacher only)' })
  @ApiResponse({ status: 200, description: 'Full anti-cheat report with timeline' })
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Get(':id/anticheat-report')
  getAntiCheatReport(@CurrentUser() user: any, @Param('id') id: string) {
    return this.antiCheatService.getAntiCheatReport(id, user.id);
  }

  @ApiTags('Anti-cheat')
  @ApiOperation({ summary: 'Get server-side timer status for an attempt' })
  @ApiResponse({ status: 200, description: 'Timer remaining seconds and expiry status' })
  @Get(':id/timer-status')
  getTimerStatus(@CurrentUser() user: any, @Param('id') id: string) {
    return this.antiCheatService.checkTimerValidity(id, user.id);
  }
}
