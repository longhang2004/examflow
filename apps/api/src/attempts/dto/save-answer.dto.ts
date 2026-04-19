import { IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveAnswerDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty()
  @IsNotEmpty()
  answer: any;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  timeSpent: number;
}
