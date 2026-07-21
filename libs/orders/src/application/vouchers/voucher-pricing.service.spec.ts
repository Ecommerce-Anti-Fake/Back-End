import { Prisma } from '@prisma/client';
import { VoucherPricingService } from './voucher-pricing.service';

describe('VoucherPricingService', () => {
  const service = new VoucherPricingService();

  it('caps percentage discounts and applies the minimum order condition', () => {
    expect(service.calculateProductDiscount({
      discountType: 'PERCENTAGE',
      percentage: new Prisma.Decimal(20),
      maxDiscountAmount: new Prisma.Decimal(30000),
      fixedAmount: null,
      minOrderAmount: new Prisma.Decimal(100000),
    }, new Prisma.Decimal(200000)).toString()).toBe('30000');

    expect(service.calculateProductDiscount({
      discountType: 'FIXED_AMOUNT',
      percentage: null,
      maxDiscountAmount: null,
      fixedAmount: new Prisma.Decimal(50000),
      minOrderAmount: new Prisma.Decimal(300000),
    }, new Prisma.Decimal(200000)).toString()).toBe('0');
  });

  it('keeps system voucher discount out of seller receivable', () => {
    const result = service.calculateGroup({
      grossAmount: new Prisma.Decimal(200000),
      shippingFee: new Prisma.Decimal(25000),
      shopProductDiscount: new Prisma.Decimal(20000),
      systemProductDiscount: new Prisma.Decimal(10000),
      shippingDiscount: new Prisma.Decimal(5000),
      shopShippingDiscount: new Prisma.Decimal(0),
      commissionRate: new Prisma.Decimal('0.2'),
    });

    expect(result.buyerPayable.toString()).toBe('190000');
    expect(result.commissionBase.toString()).toBe('180000');
    expect(result.platformFee.toString()).toBe('36000');
    expect(result.sellerReceivable.toString()).toBe('144000');
    expect(result.platformVoucherExpense.toString()).toBe('15000');
  });

  it('allocates a system discount across shop groups and preserves the total', () => {
    const allocations = service.allocateSystemDiscount([
      new Prisma.Decimal(100000),
      new Prisma.Decimal(300000),
    ], new Prisma.Decimal(50000));

    expect(allocations.map((value) => value.toString())).toEqual(['12500', '37500']);
    expect(allocations.reduce((sum, value) => sum.plus(value), new Prisma.Decimal(0)).toString()).toBe('50000');
  });
});
