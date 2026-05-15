import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentRequiredException extends HttpException {
  constructor(message: string, requiredPlan = 'pro_teacher') {
    super(
      {
        code: 'UPGRADE_REQUIRED',
        message,
        requiredPlan,
        upgradeUrl: '/billing/upgrade',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
