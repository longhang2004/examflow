import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkRequestDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  studentEmail: string;
}
