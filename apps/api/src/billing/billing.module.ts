import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { FeatureGateGuard } from './feature-gate.guard';
import { SubscriptionService } from './subscription.service';
import { VNPayService } from './vnpay.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [SubscriptionService, VNPayService, FeatureGateGuard],
  exports: [SubscriptionService, FeatureGateGuard],
})
export class BillingModule {}
