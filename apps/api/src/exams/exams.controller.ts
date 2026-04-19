import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionsDto } from './dto/add-questions.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Exams')
@Controller('exams')
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @ApiOperation({ summary: 'Find an exam by access code (public)' })
  @ApiResponse({ status: 200, description: 'Exam public info' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @Get('code/:code')
  findByAccessCode(@Param('code') code: string) {
    return this.examsService.findByAccessCode(code);
  }

  @ApiOperation({ summary: 'Create a new exam' })
  @ApiResponse({ status: 201, description: 'Exam created with access code' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateExamDto) {
    return this.examsService.create(user.id, dto);
  }

  @ApiOperation({ summary: 'List exams with filters' })
  @ApiResponse({ status: 200, description: 'Paginated exam list' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: any, @Query() query: QueryExamDto) {
    return this.examsService.findAll(user.id, query);
  }

  @ApiOperation({ summary: 'Get exam details with questions' })
  @ApiResponse({ status: 200, description: 'Exam details' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.examsService.findOne(id, user.id);
  }

  @ApiOperation({ summary: 'Update exam (DRAFT only)' })
  @ApiResponse({ status: 200, description: 'Exam updated' })
  @ApiResponse({ status: 400, description: 'Can only edit DRAFT exams' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.examsService.update(id, user.id, dto);
  }

  @ApiOperation({ summary: 'Add or update questions in an exam' })
  @ApiResponse({ status: 201, description: 'Questions added' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/questions')
  addQuestions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddQuestionsDto,
  ) {
    return this.examsService.addQuestions(id, user.id, dto);
  }

  @ApiOperation({ summary: 'Remove a question from an exam' })
  @ApiResponse({ status: 200, description: 'Question removed' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id/questions/:qid')
  removeQuestion(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('qid') qid: string,
  ) {
    return this.examsService.removeQuestion(id, qid, user.id);
  }

  @ApiOperation({ summary: 'Publish a DRAFT exam' })
  @ApiResponse({ status: 200, description: 'Exam published' })
  @ApiResponse({ status: 400, description: 'Exam must have at least one question' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/publish')
  publish(@CurrentUser() user: any, @Param('id') id: string) {
    return this.examsService.publish(id, user.id);
  }

  @ApiOperation({ summary: 'Archive a published exam' })
  @ApiResponse({ status: 200, description: 'Exam archived' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/archive')
  archive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.examsService.archive(id, user.id);
  }

  @ApiOperation({ summary: 'Get exam results and submissions' })
  @ApiResponse({ status: 200, description: 'Exam results with student list' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/results')
  getResults(@CurrentUser() user: any, @Param('id') id: string) {
    return this.examsService.getResults(id, user.id);
  }
}
