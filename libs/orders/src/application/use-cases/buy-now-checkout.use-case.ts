import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OfferForOrdering, OfferVariantForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CheckoutShippingService } from '../services';
import { CreateOrderUseCase } from './create-order.use-case';
import { VoucherPricingService } from '../vouchers/voucher-pricing.service';

type BuyNowCheckoutInput = {
  buyerUserId: string;
  offerId: string;
  variantId?: string | null;
  quantity: number;
  paymentMethod: 'COD' | 'PAYOS' | 'WALLET';
  shippingOptionCode: string;
  affiliateCode?: string | null;
  requireAffiliateAttribution?: boolean;
  systemVoucherCode?: string | null;
  shopVoucherCode?: string | null;
  shippingVoucherCode?: string | null;
};

@Injectable()
export class BuyNowCheckoutUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly checkoutShippingService: CheckoutShippingService,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly voucherPricingService: VoucherPricingService,
  ) {}

  async execute(input: BuyNowCheckoutInput) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException('Số lượng phải lớn hơn 0.');
    }

    const offer = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer) {
      throw new NotFoundException('Không tìm thấy offer.');
    }
    if (offer.offerStatus !== 'active') {
      throw new BadRequestException('Chỉ offer đang hoạt động mới có thể đặt hàng.');
    }

    const variant = await this.resolveVariant(input, offer);
    if (!variant) {
      throw new BadRequestException('Vui lòng chọn variant cho offer này.');
    }
    if (variant.price === null) {
      throw new BadRequestException('Variant chưa được cấu hình giá.');
    }
    const availableQuantity = variant.availableQuantity;
    if (input.quantity > availableQuantity) {
      throw new BadRequestException('Số lượng vượt quá tồn kho.');
    }
    const unitPrice = Number(variant.price.toString());
    const shippingOption = await this.checkoutShippingService.resolveSelectedOption({
      buyerUserId: input.buyerUserId,
      shippingOptionCode: input.shippingOptionCode,
      items: [
        {
          offerId: offer.id,
          quantity: input.quantity,
          unitPrice,
          offer,
        },
      ],
    });
    const shipping = await this.checkoutShippingService.resolveDefaultShipping(input.buyerUserId, shippingOption);
    const { paymentMethod: _paymentMethod, ...quoteInput } = input;
    const voucherQuote = await this.quote(quoteInput, true);

    return this.createOrderUseCase.execute({
      buyerUserId: input.buyerUserId,
      offerId: offer.id,
      variantId: variant?.id ?? null,
      quantity: input.quantity,
      paymentMethod: input.paymentMethod,
      shippingName: shipping.name,
      shippingPhone: shipping.phone,
      shippingAddress: shipping.address,
      shippingDistrictId: shipping.districtId,
      shippingDistrictName: shipping.districtName,
      shippingWardCode: shipping.wardCode,
      shippingWardName: shipping.wardName,
      shippingProviderCode: shippingOption.providerCode,
      shippingServiceId: shippingOption.shippingServiceId,
      shippingServiceTypeId: shippingOption.shippingServiceTypeId,
      systemVoucherCode: input.systemVoucherCode,
      shopVoucherCode: input.shopVoucherCode,
      shippingVoucherCode: input.shippingVoucherCode,
      affiliateCode: input.affiliateCode,
      requireAffiliateAttribution: input.requireAffiliateAttribution,
      voucherPricingOverride: {
        discountAmount: voucherQuote.discountAmount,
        productPayableAmount: voucherQuote.productPayableAmount!,
        platformFeeAmount: voucherQuote.platformFeeAmount!,
        sellerReceivableAmount: voucherQuote.sellerReceivableAmount!,
      },
      voucherRedemptions: voucherQuote.voucherRedemptions!,
      voucherAllocations: voucherQuote.voucherAllocations!,
    });
  }

  async quote(input: Omit<BuyNowCheckoutInput, 'paymentMethod'>, includeInternal = false) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new BadRequestException('Số lượng phải lớn hơn 0.');
    const offer = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer || offer.offerStatus !== 'active') throw new NotFoundException('Offer không khả dụng.');
    const variant = await this.resolveVariant(input, offer);
    if (!variant || variant.price === null) throw new BadRequestException('Variant chưa được cấu hình giá.');
    if (input.quantity > variant.availableQuantity) throw new BadRequestException('Số lượng vượt quá tồn kho.');
    const unitPrice = Number(variant.price.toString());
    const shippingOption = await this.checkoutShippingService.resolveSelectedOption({
      buyerUserId: input.buyerUserId,
      shippingOptionCode: input.shippingOptionCode,
      items: [{ offerId: offer.id, quantity: input.quantity, unitPrice, offer }],
    });
    const vouchers = await this.ordersRepository.findCheckoutVouchers({
      systemVoucherCode: input.systemVoucherCode,
      shopVoucherCodes: [input.shopVoucherCode ?? ''],
      shippingVoucherCodes: [input.shippingVoucherCode ?? ''],
    });
    const findCode = (value?: string | null) => vouchers.find((voucher) => voucher.code === value?.trim().toUpperCase());
    const shopVoucher = findCode(input.shopVoucherCode);
    const systemVoucher = findCode(input.systemVoucherCode);
    const shippingVoucher = findCode(input.shippingVoucherCode);
    if (shopVoucher && (shopVoucher.ownerType !== 'SHOP' || shopVoucher.shopId !== offer.shopId)) throw new BadRequestException('Voucher shop không hợp lệ');
    if (systemVoucher && systemVoucher.ownerType !== 'SYSTEM') throw new BadRequestException('Voucher hệ thống không hợp lệ');
    if (shippingVoucher && (shippingVoucher.discountType !== 'FREE_SHIPPING' || (shippingVoucher.ownerType === 'SHOP' && shippingVoucher.shopId !== offer.shopId))) throw new BadRequestException('Voucher vận chuyển không hợp lệ');
    const selectedVouchers = [shopVoucher, systemVoucher, shippingVoucher]
      .filter((voucher): voucher is NonNullable<typeof voucher> => Boolean(voucher))
      .filter((voucher, index, list) => list.findIndex((candidate) => candidate.id === voucher.id) === index);
    for (const voucher of selectedVouchers) {
      const usage = await this.ordersRepository.getVoucherUsage(voucher.id, input.buyerUserId);
      if (voucher.totalUsageLimit !== null && usage.total >= voucher.totalUsageLimit) {
        throw new BadRequestException(`Voucher ${voucher.code} đã hết lượt sử dụng`);
      }
      if (voucher.userUsageLimit !== null && usage.user >= voucher.userUsageLimit) {
        throw new BadRequestException(`Voucher ${voucher.code} đã hết lượt sử dụng cho tài khoản này`);
      }
    }
    const appliesToOffer = (voucher: typeof systemVoucher) => {
      if (!voucher || voucher.scopeType === 'ALL') return true;
      if (voucher.scopeType === 'SHOP') return voucher.ownerType === 'SHOP' ? voucher.shopId === offer.shopId : voucher.scopeIds.includes(offer.shopId);
      if (voucher.scopeType === 'OFFER') return voucher.scopeIds.includes(offer.id);
      if (voucher.scopeType === 'VARIANT') return Boolean(variant?.id && voucher.scopeIds.includes(variant.id));
      return false;
    };
    for (const voucher of [shopVoucher, systemVoucher, shippingVoucher]) {
      if (voucher && !appliesToOffer(voucher)) throw new BadRequestException('Voucher không áp dụng cho sản phẩm đã chọn');
    }
    const grossAmount = new Prisma.Decimal(unitPrice * input.quantity);
    const shopDiscount = shopVoucher && shopVoucher.discountType !== 'FREE_SHIPPING' ? this.voucherPricingService.calculateProductDiscount(shopVoucher, grossAmount) : new Prisma.Decimal(0);
    const systemDiscount = systemVoucher ? this.voucherPricingService.calculateProductDiscount(systemVoucher, grossAmount.minus(shopDiscount)) : new Prisma.Decimal(0);
    const freeShippingVoucher = shippingVoucher ?? (systemVoucher?.discountType === 'FREE_SHIPPING' ? systemVoucher : null);
    const shippingDiscount = freeShippingVoucher ? this.voucherPricingService.calculateShippingDiscount(freeShippingVoucher, new Prisma.Decimal(shippingOption.shippingFee), grossAmount) : new Prisma.Decimal(0);
    const pricing = this.voucherPricingService.calculateGroup({
      grossAmount,
      shippingFee: new Prisma.Decimal(shippingOption.shippingFee),
      shopProductDiscount: shopDiscount,
      systemProductDiscount: systemDiscount,
      shippingDiscount,
      shopShippingDiscount: freeShippingVoucher?.ownerType === 'SHOP' ? shippingDiscount : new Prisma.Decimal(0),
      commissionRate: new Prisma.Decimal('0.2'),
    });
    return {
      baseAmount: Number(grossAmount),
      shippingFeeAmount: shippingOption.shippingFee,
      discountAmount: Number(shopDiscount.plus(systemDiscount).plus(shippingDiscount)),
      buyerPayableAmount: Number(pricing.buyerPayable),
      sellerReceivableAmount: Number(pricing.sellerReceivable),
      platformFeeAmount: Number(pricing.platformFee),
      ...(includeInternal ? { productPayableAmount: Number(pricing.buyerPayable.minus(new Prisma.Decimal(shippingOption.shippingFee))) } : {}),
      ...(includeInternal ? { voucherRedemptions: selectedVouchers
        .map((voucher) => ({ voucherId: voucher.id, userId: input.buyerUserId, idempotencyKey: randomUUID() })),
      voucherAllocations: [
        ...(shopVoucher ? [{ voucherId: shopVoucher.id, productDiscountAmount: Number(shopDiscount), shippingDiscountAmount: 0, eligibleBaseAmount: Number(grossAmount), fundingSource: 'SHOP' as const }] : []),
        ...(systemVoucher ? [{ voucherId: systemVoucher.id, productDiscountAmount: Number(systemDiscount), shippingDiscountAmount: systemVoucher.discountType === 'FREE_SHIPPING' ? Number(shippingDiscount) : 0, eligibleBaseAmount: Number(grossAmount.minus(shopDiscount)), fundingSource: 'SYSTEM' as const }] : []),
        ...(shippingVoucher && shippingVoucher.id !== systemVoucher?.id ? [{ voucherId: shippingVoucher.id, productDiscountAmount: 0, shippingDiscountAmount: Number(shippingDiscount), eligibleBaseAmount: Number(new Prisma.Decimal(shippingOption.shippingFee)), fundingSource: shippingVoucher.ownerType === 'SHOP' ? 'SHOP' as const : 'SYSTEM' as const }] : []),
      ] } : {}),
    };
  }

  private async resolveVariant(input: { variantId?: string | null }, offer: OfferForOrdering) {
    const variantId = input.variantId?.trim() || null;
    if (!variantId) {
      const variantCount = await this.ordersRepository.countOfferVariants(offer.id);
      if (variantCount > 0) {
        throw new BadRequestException('Vui lòng chọn variant cho offer này.');
      }
      return null;
    }

    const variant = await this.ordersRepository.findOfferVariantForOrdering({
      offerId: offer.id,
      variantId,
    });
    if (!variant || !variant.isActive) {
      throw new BadRequestException('Variant không khả dụng.');
    }
    return variant as OfferVariantForOrdering;
  }
}
