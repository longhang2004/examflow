import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BillingFeatures, FREE_PLAN } from './billing-plans';

type PlanSnapshot = Omit<BillingPlan, 'features'> & {
  features: BillingFeatures;
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private stripe: any = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {
    const stripeSecret = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecret) {
      this.stripe = new Stripe(stripeSecret);
    }
  }

  private cacheKey(userId: string) {
    return `plan:${userId}`;
  }

  private normalizePlan(plan: BillingPlan): PlanSnapshot {
    return {
      ...plan,
      features: plan.features as BillingFeatures,
    };
  }

  private fallbackFreePlan(): PlanSnapshot {
    return {
      id: 'free',
      name: FREE_PLAN.name,
      displayName: FREE_PLAN.displayName,
      price: FREE_PLAN.price,
      priceVND: FREE_PLAN.priceVND,
      interval: FREE_PLAN.interval,
      stripePriceId: null,
      features: FREE_PLAN.features,
      isActive: true,
      createdAt: new Date(0),
    };
  }

  private async safeCacheGet(key: string) {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.warn(`Plan cache read failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async safeCacheSet(key: string, value: string, ttl: number) {
    try {
      await this.redis.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(`Plan cache write failed: ${(error as Error).message}`);
    }
  }

  private async safeCacheDel(key: string) {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Plan cache delete failed: ${(error as Error).message}`);
    }
  }

  async listPlans() {
    return this.prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ price: 'asc' }, { name: 'asc' }],
    });
  }

  async findPlan(planIdOrName: string) {
    const plan = await this.prisma.billingPlan.findFirst({
      where: {
        OR: [{ id: planIdOrName }, { name: planIdOrName }],
        isActive: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Billing plan not found');
    }

    return plan;
  }

  async getActivePlan(userId: string) {
    const key = this.cacheKey(userId);
    const cached = await this.safeCacheGet(key);
    if (cached) {
      return JSON.parse(cached) as {
        plan: PlanSnapshot;
        subscription: any | null;
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        currentPeriodEnd: { gt: new Date() },
        OR: [
          { userId },
          ...(user.organizationId ? [{ organizationId: user.organizationId }] : []),
        ],
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    const freePlan = await this.prisma.billingPlan.findUnique({ where: { name: 'free' } });
    const result = {
      plan: subscription?.plan
        ? this.normalizePlan(subscription.plan)
        : freePlan
          ? this.normalizePlan(freePlan)
          : this.fallbackFreePlan(),
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEndsAt: subscription.trialEndsAt,
          }
        : null,
    };

    await this.safeCacheSet(key, JSON.stringify(result), 300);
    return result;
  }

  private async getUsageValue(userId: string, feature: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    const orgScope = user?.organizationId ? { organizationId: user.organizationId } : null;
    const ownerScope = { creatorId: userId };

    switch (feature) {
      case 'maxExams':
        return this.prisma.exam.count({ where: orgScope ?? ownerScope });
      case 'maxQuestions':
        return this.prisma.question.count({ where: orgScope ?? ownerScope });
      case 'maxTeachers':
        return user?.organizationId
          ? this.prisma.user.count({
              where: {
                organizationId: user.organizationId,
                role: { in: ['TEACHER', 'ORG_ADMIN'] },
              },
            })
          : 1;
      case 'maxStudents':
        return user?.organizationId
          ? this.prisma.user.count({
              where: { organizationId: user.organizationId, role: 'STUDENT' },
            })
          : 0;
      case 'aiGeneratePerHour': {
        const current = await this.safeCacheGet(`ai:ratelimit:${userId}`);
        return current ? parseInt(current, 10) : 0;
      }
      default:
        return 0;
    }
  }

  async checkFeatureAccess(userId: string, feature: string, value?: number) {
    const { plan } = await this.getActivePlan(userId);
    const features = plan.features;
    const configured = features[feature as keyof BillingFeatures];
    const upgradeRequired = await this.prisma.billingPlan.findUnique({
      where: { name: 'pro_teacher' },
    });

    if (configured === true || configured === 'advanced') {
      return { allowed: true, limit: -1, current: 0, upgradeRequired: null };
    }

    if (configured === false || configured === undefined || configured === 'basic') {
      return {
        allowed: false,
        limit: 0,
        current: 0,
        upgradeRequired,
      };
    }

    if (typeof configured === 'number') {
      const current = value ?? (await this.getUsageValue(userId, feature));
      const allowed = configured === -1 || current < configured;
      return {
        allowed,
        limit: configured,
        current,
        upgradeRequired: allowed ? null : upgradeRequired,
      };
    }

    return { allowed: false, limit: 0, current: 0, upgradeRequired };
  }

  async getUsage(userId: string) {
    const { plan, subscription } = await this.getActivePlan(userId);
    const usageFeatures = [
      'maxExams',
      'maxQuestions',
      'maxTeachers',
      'maxStudents',
      'aiGeneratePerHour',
    ];

    const usage = await Promise.all(
      usageFeatures
        .filter((feature) => plan.features[feature as keyof BillingFeatures] !== undefined)
        .map(async (feature) => {
          const limit = plan.features[feature as keyof BillingFeatures] as number;
          return {
            feature,
            limit,
            current: await this.getUsageValue(userId, feature),
          };
        }),
    );

    return { plan, subscription, usage };
  }

  async createSubscription(
    userId: string,
    planIdOrName: string,
    paymentMethod: 'stripe' | 'vnpay',
  ) {
    const plan = await this.findPlan(planIdOrName);
    if (plan.name === 'free') {
      throw new BadRequestException('Free plan does not require a subscription');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const existing = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const subscription = existing
      ? await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            planId: plan.id,
            status: paymentMethod === 'vnpay' ? 'UNPAID' : 'TRIALING',
            currentPeriodStart: now,
            currentPeriodEnd: trialEndsAt,
            trialEndsAt,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          },
          include: { plan: true },
        })
      : await this.prisma.subscription.create({
          data: {
            userId,
            planId: plan.id,
            status: paymentMethod === 'vnpay' ? 'UNPAID' : 'TRIALING',
            currentPeriodStart: now,
            currentPeriodEnd: trialEndsAt,
            trialEndsAt,
          },
          include: { plan: true },
        });

    await this.safeCacheDel(this.cacheKey(userId));
    return subscription;
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.findCurrentUserSubscription(userId);

    if (this.stripe && subscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
      include: { plan: true },
    });
    await this.safeCacheDel(this.cacheKey(userId));
    return updated;
  }

  async reactivateSubscription(userId: string) {
    const subscription = await this.findCurrentUserSubscription(userId);

    if (this.stripe && subscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false, canceledAt: null },
      include: { plan: true },
    });
    await this.safeCacheDel(this.cacheKey(userId));
    return updated;
  }

  async findCurrentUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID'] },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async getInvoices(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { subscription: { userId } };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { subscription: { include: { plan: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createStripeCheckoutSession(userId: string, planIdOrName: string) {
    const plan = await this.findPlan(planIdOrName);
    if (plan.name === 'free') {
      throw new BadRequestException('Free plan does not need checkout');
    }

    if (!this.stripe) {
      const subscription = await this.createSubscription(userId, plan.id, 'stripe');
      return {
        checkoutUrl: `${this.configService.get<string>('FRONTEND_URL')}/billing/success?mode=mock&subscription_id=${subscription.id}`,
        mode: 'mock',
      };
    }

    if (!plan.stripePriceId) {
      throw new BadRequestException('Selected plan does not have a Stripe price configured');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId, planId: plan.id },
      },
      success_url:
        this.configService.get<string>('STRIPE_SUCCESS_URL') ||
        `${this.configService.get<string>('FRONTEND_URL')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        this.configService.get<string>('STRIPE_CANCEL_URL') ||
        `${this.configService.get<string>('FRONTEND_URL')}/billing`,
      metadata: { userId, planId: plan.id },
    });

    return { checkoutUrl: session.url, mode: 'stripe' };
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer, parsedBody: any) {
    if (!this.stripe) {
      return { received: true, mode: 'ignored' };
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    const event = webhookSecret
      ? this.stripe.webhooks.constructEvent(rawBody, signature ?? '', webhookSecret)
      : parsedBody;

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        await this.syncStripeSubscription(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.markStripeSubscriptionCanceled(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.syncStripeInvoice(event.data.object, 'PAID');
        break;
      case 'invoice.payment_failed':
        await this.syncStripeInvoice(event.data.object, 'FAILED');
        break;
      case 'customer.subscription.trial_will_end':
        this.logger.log(`Trial will end for Stripe subscription ${event.data.object.id}`);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private mapStripeStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'trialing':
        return 'TRIALING';
      case 'active':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'unpaid':
        return 'UNPAID';
      case 'canceled':
      default:
        return 'CANCELED';
    }
  }

  private async syncStripeSubscription(subscription: any) {
    const metadata = subscription.metadata ?? {};
    const userId = metadata.userId;
    const planId = metadata.planId;
    if (!userId || !planId) {
      this.logger.warn(`Stripe subscription ${subscription.id} is missing metadata`);
      return;
    }

    const currentPeriodStart = new Date((subscription as any).current_period_start * 1000);
    const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null;

    await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      update: {
        status: this.mapStripeStatus(subscription.status),
        stripeCustomerId: String(subscription.customer),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
        trialEndsAt,
      },
      create: {
        userId,
        planId,
        status: this.mapStripeStatus(subscription.status),
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: String(subscription.customer),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
        trialEndsAt,
      },
    });

    await this.safeCacheDel(this.cacheKey(userId));
  }

  private async markStripeSubscriptionCanceled(subscription: any) {
    const existing = await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: false,
        canceledAt: new Date(),
      },
    });
    if (existing.userId) {
      await this.safeCacheDel(this.cacheKey(existing.userId));
    }
  }

  private async syncStripeInvoice(invoice: any, status: 'PAID' | 'FAILED') {
    const stripeSubscriptionId =
      typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : (invoice as any).subscription?.id;
    if (!stripeSubscriptionId) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });
    if (!subscription) return;

    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      update: {
        status,
        paidAt: status === 'PAID' ? new Date() : null,
        hostedUrl: invoice.hosted_invoice_url,
      },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        amount: (invoice.amount_due ?? invoice.amount_paid ?? 0) / 100,
        currency: invoice.currency?.toUpperCase() ?? 'USD',
        status,
        paymentMethod: 'stripe',
        paidAt: status === 'PAID' ? new Date() : null,
        hostedUrl: invoice.hosted_invoice_url,
      },
    });
  }
}
