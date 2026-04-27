import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { Sm2Service } from './sm2.service';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, Sm2Service],
  exports: [ReviewService],
})
export class ReviewModule {}
