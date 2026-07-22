import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type VoucherDiscountInput = {
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  percentage?: Prisma.Decimal | null;
  fixedAmount?: Prisma.Decimal | null;
  maxDiscountAmount?: Prisma.Decimal | null;
  minOrderAmount?: Prisma.Decimal | null;
};

export type VoucherGroupPricingInput = {
  grossAmount: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  shopProductDiscount: Prisma.Decimal;
  systemProductDiscount: Prisma.Decimal;
  shippingDiscount: Prisma.Decimal;
  shopShippingDiscount: Prisma.Decimal;
  commissionRate: Prisma.Decimal;
};

export type VoucherGroupPricing = {
  buyerPayable: Prisma.Decimal;
  commissionBase: Prisma.Decimal;
  platformFee: Prisma.Decimal;
  sellerReceivable: Prisma.Decimal;
  platformVoucherExpense: Prisma.Decimal;
  shopVoucherExpense: Prisma.Decimal;
};

@Injectable()
export class VoucherPricingService {
  calculateProductDiscount(voucher: VoucherDiscountInput, eligibleAmount: Prisma.Decimal) {
    if (eligibleAmount.lte(0) || eligibleAmount.lt(voucher.minOrderAmount ?? 0)) {
      return new Prisma.Decimal(0);
    }

    let discount = new Prisma.Decimal(0);
    if (voucher.discountType === 'PERCENTAGE') {
      discount = eligibleAmount.mul(voucher.percentage ?? 0).div(100);
    } else if (voucher.discountType === 'FIXED_AMOUNT') {
      discount = new Prisma.Decimal(voucher.fixedAmount ?? 0);
    }

    if (voucher.maxDiscountAmount && discount.gt(voucher.maxDiscountAmount)) {
      discount = new Prisma.Decimal(voucher.maxDiscountAmount);
    }
    if (discount.gt(eligibleAmount)) discount = new Prisma.Decimal(eligibleAmount);
    return this.round(discount);
  }

  calculateShippingDiscount(voucher: VoucherDiscountInput, shippingFee: Prisma.Decimal, eligibleOrderAmount = shippingFee) {
    if (voucher.discountType !== 'FREE_SHIPPING' || eligibleOrderAmount.lt(voucher.minOrderAmount ?? 0)) return new Prisma.Decimal(0);
    const discount = voucher.maxDiscountAmount
      ? Prisma.Decimal.min(shippingFee, voucher.maxDiscountAmount)
      : shippingFee;
    return this.round(discount);
  }

  calculateGroup(input: VoucherGroupPricingInput): VoucherGroupPricing {
    const commissionBase = this.round(Prisma.Decimal.max(
      new Prisma.Decimal(0),
      input.grossAmount.minus(input.shopProductDiscount),
    ));
    const platformFee = this.round(commissionBase.mul(input.commissionRate));
    const shopVoucherExpense = this.round(
      input.shopProductDiscount.plus(input.shopShippingDiscount),
    );
    const sellerReceivable = this.round(
      Prisma.Decimal.max(
        new Prisma.Decimal(0),
        commissionBase.minus(platformFee).minus(input.shopShippingDiscount),
      ),
    );
    const buyerPayable = this.round(
      Prisma.Decimal.max(
        new Prisma.Decimal(0),
        input.grossAmount
          .minus(input.shopProductDiscount)
          .minus(input.systemProductDiscount)
          .plus(input.shippingFee)
          .minus(input.shippingDiscount),
      ),
    );
    return {
      buyerPayable,
      commissionBase,
      platformFee,
      sellerReceivable,
      platformVoucherExpense: this.round(input.systemProductDiscount.plus(
        input.shippingDiscount.minus(input.shopShippingDiscount),
      )),
      shopVoucherExpense,
    };
  }

  allocateSystemDiscount(eligibleAmounts: Prisma.Decimal[], discount: Prisma.Decimal) {
    const total = eligibleAmounts.reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0));
    if (total.lte(0) || discount.lte(0)) return eligibleAmounts.map(() => new Prisma.Decimal(0));

    const cappedDiscount = Prisma.Decimal.min(discount, total);
    let allocated = new Prisma.Decimal(0);
    return eligibleAmounts.map((amount, index) => {
      if (index === eligibleAmounts.length - 1) return this.round(cappedDiscount.minus(allocated));
      const value = this.round(cappedDiscount.mul(amount).div(total));
      allocated = allocated.plus(value);
      return value;
    });
  }

  private round(value: Prisma.Decimal | number) {
    return new Prisma.Decimal(value).toDecimalPlaces(2);
  }
}
