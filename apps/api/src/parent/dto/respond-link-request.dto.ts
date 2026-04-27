import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondLinkRequestDto {
  @ApiProperty()
  @IsBoolean()
  accept: boolean;
}
