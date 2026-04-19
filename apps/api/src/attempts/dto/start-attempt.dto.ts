import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartAttemptDto {
  @ApiProperty()
  @IsUUID()
  examId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessCode?: string;
}
