import { IsArray, IsInt, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ExamQuestionItemDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  point: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order: number;
}

export class AddQuestionsDto {
  @ApiProperty({ type: [ExamQuestionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionItemDto)
  questions: ExamQuestionItemDto[];
}
