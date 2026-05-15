import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type VNPayQuery = Record<string, string | string[] | undefined>;

@Injectable()
export class VNPayService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  private formatDate(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join('');
  }

  private sortParams(params: Record<string, string>) {
    return Object.keys(params)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
  }

  private sign(params: Record<string, string>) {
    const secret = this.configService.get<string>('VNPAY_HASH_SECRET');
    if (!secret) {
      throw new BadRequestException('VNPay is not configured');
    }

    const signedPayload = new URLSearchParams(this.sortParams(params)).toString();
    return createHmac('sha512', secret).update(signedPayload, 'utf8').digest('hex');
  }

  async createPaymentUrl(
    subscriptionId: string,
    amountVND: number,
    ipAddress = '127.0.0.1',
  ) {
    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
    const paymentUrl =
      this.configService.get<string>('VNPAY_PAYMENT_URL') ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl =
      this.configService.get<string>('VNPAY_RETURN_URL') ||
      `${this.configService.get<string>('FRONTEND_URL')}/billing/vnpay/return`;

    if (!tmnCode) {
      throw new BadRequestException('VNPay is not configured');
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        subscriptionId,
        amount: amountVND / 25000,
        amountVND,
        currency: 'VND',
        paymentMethod: 'vnpay',
        status: 'PENDING',
      },
    });

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(amountVND * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: invoice.id,
      vnp_OrderInfo: `ExamFlow subscription ${subscriptionId}`,
      vnp_OrderType: 'billpayment',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddress,
      vnp_CreateDate: this.formatDate(new Date()),
    };

    const signedParams = {
      ...params,
      vnp_SecureHash: this.sign(params),
    };

    return {
      invoice,
      paymentUrl: `${paymentUrl}?${new URLSearchParams(this.sortParams(signedParams)).toString()}`,
    };
  }

  verifySignature(query: VNPayQuery) {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
      if (typeof value === 'string') params[key] = value;
    }

    const expected = this.sign(params);
    return expected === query.vnp_SecureHash;
  }

  async verifyReturn(query: VNPayQuery) {
    if (!this.verifySignature(query)) {
      throw new BadRequestException('Invalid VNPay signature');
    }

    const invoiceId = query.vnp_TxnRef;
    if (typeof invoiceId !== 'string') {
      throw new BadRequestException('Missing VNPay transaction reference');
    }

    const paid = query.vnp_ResponseCode === '00';
    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        vnpayTxnRef: invoiceId,
        status: paid ? 'PAID' : 'FAILED',
        paidAt: paid ? new Date() : null,
      },
      include: { subscription: true },
    });

    if (paid) {
      await this.prisma.subscription.update({
        where: { id: invoice.subscriptionId },
        data: { status: 'ACTIVE' },
      });
    }

    return { invoice, paid };
  }
}
