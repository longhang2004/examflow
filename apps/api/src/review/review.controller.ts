import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewService } from './review.service';
import { AddReviewCardDto } from './dto/add-review-card.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';

@ApiTags('Review')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('review')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @ApiOperation({ summary: 'Get due review cards' })
  @Get('due')
  getDue(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return this.reviewService.getReviewDue(user.id, Number(limit) || 20);
  }

  @ApiOperation({ summary: 'Submit a review rating' })
  @Post('submit')
  submit(@CurrentUser() user: any, @Body() dto: SubmitReviewDto) {
    return this.reviewService.submitReview(
      user.id,
      dto.questionId,
      dto.quality,
      dto.timeTaken,
    );
  }

  @ApiOperation({ summary: 'Get review stats' })
  @Get('stats')
  stats(@CurrentUser() user: any) {
    return this.reviewService.getReviewStats(user.id);
  }

  @ApiOperation({ summary: 'Add one question to the review queue' })
  @Post('add')
  add(@CurrentUser() user: any, @Body() dto: AddReviewCardDto) {
    return this.reviewService.addToReviewQueue(user.id, dto.questionId);
  }

  @ApiOperation({ summary: 'Add incorrect answers from an attempt to review' })
  @Post('add-from-attempt/:attemptId')
  addFromAttempt(@CurrentUser() user: any, @Param('attemptId') attemptId: string) {
    return this.reviewService.bulkAddFromAttempt(user.id, attemptId);
  }
}
