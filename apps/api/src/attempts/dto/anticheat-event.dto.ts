import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TabSwitchEventDto {
  @ApiProperty({ description: 'ISO timestamp of the tab switch event' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;
}

export class FullscreenExitEventDto {
  @ApiProperty({ description: 'ISO timestamp of the fullscreen exit event' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({ description: 'Duration in milliseconds the user was outside fullscreen' })
  @IsNumber()
  @Min(0)
  durationMs: number;
}
