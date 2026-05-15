import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ example: 'pro_teacher' })
  @IsString()
  planId: string;

  @ApiProperty({ enum: ['stripe', 'vnpay'] })
  @IsIn(['stripe', 'vnpay'])
  paymentMethod: 'stripe' | 'vnpay';
}
