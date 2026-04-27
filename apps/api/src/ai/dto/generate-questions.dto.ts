import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';

export class GenerateQuestionsDto {
  @ApiProperty({
    description: 'Array of question types to generate',
    example: ['MULTIPLE_CHOICE', 'TRUE_FALSE'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(QuestionType, { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  questionTypes: QuestionType[];

  @ApiProperty({ description: 'Total number of questions to generate', example: 5 })
  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  count: number;

  @ApiProperty({ description: 'Difficulty level: 1=easy, 2=medium, 3=hard', example: 2 })
  @IsIn([1, 2, 3])
  @Type(() => Number)
  difficulty: 1 | 2 | 3;

  @ApiProperty({ description: 'Language for generated questions', default: 'vi' })
  @IsIn(['vi', 'en'])
  @IsOptional()
  language?: 'vi' | 'en' = 'vi';

  @ApiPropertyOptional({ description: 'Additional instructions for AI' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalInstructions?: string;
}

export class GenerateFromTextDto extends GenerateQuestionsDto {
  @ApiProperty({ description: 'Source text to generate questions from', minLength: 100 })
  @IsString()
  @MinLength(100)
  @MaxLength(15000)
  text: string;
}

export class SuggestTagsDto {
  @ApiProperty({ description: 'Question content to suggest tags for' })
  @IsString()
  @MinLength(10)
  content: string;
}

export class SuggestDifficultyDto {
  @ApiProperty({ description: 'Question content' })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiProperty({ description: 'Correct answer data' })
  correctAnswer: any;
}
