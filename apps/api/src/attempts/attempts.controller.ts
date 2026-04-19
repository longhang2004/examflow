import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attempts')
export class AttemptsController {
  constructor(private attemptsService: AttemptsService) {}

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
}
