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
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @ApiOperation({ summary: 'Create a new question' })
  @ApiResponse({ status: 201, description: 'Question created' })
  @Roles(Role.TEACHER, Role.ORG_ADMIN, Role.SUPER_ADMIN)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateQuestionDto) {
    return this.questionsService.create(user.id, dto);
  }

  @ApiOperation({ summary: 'List questions with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated question list' })
  @Get()
  findAll(@CurrentUser() user: any, @Query() query: QueryQuestionDto) {
    return this.questionsService.findAll(user.id, query);
  }

  @ApiOperation({ summary: 'Get a question by ID' })
  @ApiResponse({ status: 200, description: 'Question details' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.questionsService.findOne(id, user.id);
  }

  @ApiOperation({ summary: 'Update a question' })
  @ApiResponse({ status: 200, description: 'Question updated' })
  @ApiResponse({ status: 403, description: 'Not authorized to update' })
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, user.id, dto);
  }

  @ApiOperation({ summary: 'Delete a question' })
  @ApiResponse({ status: 200, description: 'Question deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete question used in published exam' })
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.questionsService.remove(id, user.id);
  }
}
