import { Module } from '@nestjs/common';
import { ParentController, StudentParentRequestsController } from './parent.controller';
import { ParentService } from './parent.service';

@Module({
  controllers: [ParentController, StudentParentRequestsController],
  providers: [ParentService],
})
export class ParentModule {}
