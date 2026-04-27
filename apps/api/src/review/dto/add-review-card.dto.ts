import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddReviewCardDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;
}
