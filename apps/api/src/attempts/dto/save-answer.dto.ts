import { IsDefined, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveAnswerDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty({ description: 'Answer value — string, boolean, array, etc. depending on question type' })
  @IsDefined()
  answer: any;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  timeSpent: number;
}
