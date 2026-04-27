import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitReviewDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty({ minimum: 0, maximum: 5 })
  @IsInt()
  @Min(0)
  @Max(5)
  quality: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  timeTaken: number;
}
