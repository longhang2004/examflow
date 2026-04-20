import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeAnswerItemDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  pointEarned: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class GradeAttemptDto {
  @ApiProperty({ type: [GradeAnswerItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerItemDto)
  grades: GradeAnswerItemDto[];
}
