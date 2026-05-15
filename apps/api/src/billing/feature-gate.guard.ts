import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_FEATURE_KEY,
  RequiredFeatureMetadata,
} from './feature-gate.constants';
import { PaymentRequiredException } from './payment-required.exception';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class FeatureGateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptions: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RequiredFeatureMetadata>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) {
      return false;
    }

    const access = await this.subscriptions.checkFeatureAccess(userId, metadata.feature);
    if (!access.allowed) {
      throw new PaymentRequiredException(
        metadata.errorMessage ?? `Upgrade required for ${metadata.feature}`,
        access.upgradeRequired?.name,
      );
    }

    return true;
  }
}
