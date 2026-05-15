import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';
import { VNPayService } from './vnpay.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(
    private subscriptions: SubscriptionService,
    private vnpay: VNPayService,
  ) {}

  @ApiOperation({ summary: 'List public subscription plans' })
  @Get('plans')
  listPlans() {
    return this.subscriptions.listPlans();
  }

  @ApiOperation({ summary: 'Get current user subscription and plan' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-subscription')
  getMySubscription(@CurrentUser() user: any) {
    return this.subscriptions.getActivePlan(user.id);
  }

  @ApiOperation({ summary: 'Get current user billing usage' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('usage')
  getUsage(@CurrentUser() user: any) {
    return this.subscriptions.getUsage(user.id);
  }

  @ApiOperation({ summary: 'Get current user invoice history' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('invoices')
  getInvoices(@CurrentUser() user: any, @Query() query: QueryInvoicesDto) {
    return this.subscriptions.getInvoices(user.id, query.page, query.limit);
  }

  @ApiOperation({ summary: 'Create a subscription record' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@CurrentUser() user: any, @Body() dto: SubscribeDto) {
    return this.subscriptions.createSubscription(user.id, dto.planId, dto.paymentMethod);
  }

  @ApiOperation({ summary: 'Cancel subscription at period end' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancel(@CurrentUser() user: any) {
    return this.subscriptions.cancelSubscription(user.id);
  }

  @ApiOperation({ summary: 'Reactivate a canceled-at-period-end subscription' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reactivate')
  reactivate(@CurrentUser() user: any) {
    return this.subscriptions.reactivateSubscription(user.id);
  }

  @ApiOperation({ summary: 'Create Stripe Checkout Session URL' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Checkout URL created' })
  @UseGuards(JwtAuthGuard)
  @Post('checkout/stripe')
  createStripeCheckout(@CurrentUser() user: any, @Body() dto: CheckoutDto) {
    return this.subscriptions.createStripeCheckoutSession(user.id, dto.planId);
  }

  @ApiOperation({ summary: 'Create VNPay payment URL' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkout/vnpay')
  async createVNPayCheckout(
    @CurrentUser() user: any,
    @Body() dto: CheckoutDto,
    @Ip() ipAddress: string,
  ) {
    const subscription = await this.subscriptions.createSubscription(
      user.id,
      dto.planId,
      'vnpay',
    );
    const result = await this.vnpay.createPaymentUrl(
      subscription.id,
      subscription.plan.priceVND,
      ipAddress,
    );
    return { paymentUrl: result.paymentUrl, invoice: result.invoice };
  }

  @ApiOperation({ summary: 'Handle VNPay browser return' })
  @Get('vnpay/return')
  @Redirect()
  async verifyVNPayReturn(@Query() query: Record<string, string>) {
    const result = await this.vnpay.verifyReturn(query);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const status = result.paid ? 'success' : 'failed';
    return { url: `${frontendUrl}/billing/${status}?invoice_id=${result.invoice.id}` };
  }
}
