import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AttemptsModule } from '../attempts/attempts.module';

@Module({
  imports: [AttemptsModule],
  providers: [TasksService],
})
export class TasksModule {}
