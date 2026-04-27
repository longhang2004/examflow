import { Module } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { AttemptsController } from './attempts.controller';
import { GradingService } from './grading.service';
import { AntiCheatService } from './anticheat.service';
import { ReviewModule } from '../review/review.module';

@Module({
  imports: [ReviewModule],
  providers: [AttemptsService, GradingService, AntiCheatService],
  controllers: [AttemptsController],
  exports: [AttemptsService, AntiCheatService],
})
export class AttemptsModule {}
