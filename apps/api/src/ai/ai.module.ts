import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { DocumentParserService } from './document-parser.service';

@Module({
  providers: [AiService, DocumentParserService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
