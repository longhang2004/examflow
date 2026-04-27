import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParentService } from './parent.service';
import { LinkRequestDto } from './dto/link-request.dto';
import { RespondLinkRequestDto } from './dto/respond-link-request.dto';

@ApiTags('Parent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parent')
export class ParentController {
  constructor(private parentService: ParentService) {}

  @ApiOperation({ summary: 'Send a parent-student link request' })
  @Roles(Role.PARENT)
  @Post('link-request')
  sendLinkRequest(@CurrentUser() user: any, @Body() dto: LinkRequestDto) {
    return this.parentService.sendLinkRequest(user.id, dto.studentEmail);
  }

  @ApiOperation({ summary: 'List accepted linked students' })
  @Roles(Role.PARENT)
  @Get('my-students')
  getMyStudents(@CurrentUser() user: any) {
    return this.parentService.getMyStudents(user.id);
  }

  @ApiOperation({ summary: 'Get linked student progress details' })
  @Roles(Role.PARENT)
  @Get('students/:studentId')
  getStudentDetail(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getStudentDetail(user.id, studentId);
  }
}

@ApiTags('Student Parent Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student/parent-requests')
export class StudentParentRequestsController {
  constructor(private parentService: ParentService) {}

  @ApiOperation({ summary: 'List pending parent link requests' })
  @Roles(Role.STUDENT)
  @Get()
  getPendingRequests(@CurrentUser() user: any) {
    return this.parentService.getPendingRequests(user.id);
  }

  @ApiOperation({ summary: 'Accept or reject a parent link request' })
  @Roles(Role.STUDENT)
  @Patch(':parentId')
  respond(
    @CurrentUser() user: any,
    @Param('parentId') parentId: string,
    @Body() dto: RespondLinkRequestDto,
  ) {
    return this.parentService.respondToLinkRequest(user.id, parentId, dto.accept);
  }
}
