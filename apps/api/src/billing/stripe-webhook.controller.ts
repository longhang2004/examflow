import { Body, Controller, Headers, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { VNPayService } from './vnpay.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('Billing')
@Controller('billing/webhook')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private subscriptions: SubscriptionService,
    private vnpay: VNPayService,
  ) {}

  @ApiOperation({ summary: 'Receive Stripe billing webhook' })
  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() request: RawBodyRequest,
    @Body() body: any,
  ) {
    try {
      return await this.subscriptions.handleStripeWebhook(
        signature,
        request.rawBody ?? Buffer.from(JSON.stringify(body)),
        body,
      );
    } catch (error) {
      this.logger.error(`Stripe webhook failed: ${(error as Error).message}`);
      return { received: true, error: 'processing_failed' };
    }
  }

  @ApiOperation({ summary: 'Receive VNPay billing IPN webhook' })
  @Post('vnpay')
  @HttpCode(200)
  async handleVNPayWebhook(@Body() body: Record<string, string>) {
    try {
      await this.vnpay.verifyReturn(body);
      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (error) {
      this.logger.error(`VNPay webhook failed: ${(error as Error).message}`);
      return { RspCode: '97', Message: 'Invalid signature' };
    }
  }
}
