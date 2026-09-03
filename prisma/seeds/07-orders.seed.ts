import { PrismaClient } from '@prisma/client';
import { COUNTS, id, money, pick, recentDate, SeedContext } from './00-utils';

const orderStatuses = [
  ['completed', 'DELIVERED'],
  ['paid', 'PROCESSING'],
  ['shipping', 'SHIPPING'],
  ['pending', 'PENDING'],
  ['cancelled', 'CANCELLED'],
] as [string, string][];

export async function seedOrders(prisma: PrismaClient, ctx: SeedContext) {
  for (let buyerIndex = 0; buyerIndex < ctx.buyers.length; buyerIndex += 1) {
    const buyer = ctx.buyers[buyerIndex];
    const cart = await prisma.cart.upsert({
      where: {
        buyerUserId_cartStatus: { buyerUserId: buyer.id, cartStatus: 'ACTIVE' },
      },
      update: {},
      create: { id: id(), buyerUserId: buyer.id, cartStatus: 'ACTIVE' },
    });

    for (let j = 0; j < 4; j += 1) {
      const offer = pick(ctx.offers, buyerIndex * 4 + j);
      const shop =
        ctx.shops.find((item) => item.id === offer.shopId) ??
        pick(ctx.shops, buyerIndex);
      const variant = await prisma.offerVariant.findFirst({
        where: { offerId: offer.id, isActive: true },
        orderBy: { price: 'asc' },
      });
      if (!variant) throw new Error(`Offer ${offer.id} has no active variant`);
      const existingCartItem = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, offerId: offer.id },
      });
      if (!existingCartItem) {
        await prisma.cartItem.create({
          data: {
            id: id(),
            cartId: cart.id,
            offerId: offer.id,
            variantId: variant.id,
            quantity: 1 + (j % 3),
            offerTitleSnapshot: offer.title,
            unitPriceSnapshot: variant.price ?? money(0),
            currencySnapshot: offer.currency,
            shopNameSnapshot: shop.shopName,
          },
        });
      }
    }
  }

  for (let i = 0; i < COUNTS.favoriteOffers; i += 1) {
    await prisma.userFavoriteOffer.upsert({
      where: {
        userId_offerId: {
          userId: pick(ctx.buyers, i).id,
          offerId: pick(ctx.offers, i).id,
        },
      },
      update: {},
      create: {
        id: id(),
        userId: pick(ctx.buyers, i).id,
        offerId: pick(ctx.offers, i).id,
      },
    });
  }

  for (let i = 0; i < COUNTS.orders; i += 1) {
    const itemCount = i < 100 ? 2 : 1;
    const itemPlans: Array<{
      offer: (typeof ctx.offers)[number];
      variant: NonNullable<
        Awaited<ReturnType<typeof prisma.offerVariant.findFirst>>
      >;
      quantity: number;
    }> = [];
    for (let j = 0; j < itemCount; j += 1) {
      const offer = pick(ctx.offers, i + j);
      const variant = await prisma.offerVariant.findFirst({
        where: { offerId: offer.id, isActive: true },
        orderBy: { price: 'asc' },
      });
      if (!variant) throw new Error(`Offer ${offer.id} has no active variant`);
      itemPlans.push({ offer, variant, quantity: j === 0 ? 1 + (i % 3) : 1 });
    }

    const buyer = pick(ctx.buyers, i);
    const firstShop =
      ctx.shops.find((shop) => shop.id === itemPlans[0].offer.shopId) ??
      pick(ctx.shops, i);
    const hasDistributionContext = i % 5 === 0;
    const buyerShop = hasDistributionContext
      ? pick(ctx.distributorShops, i)
      : null;
    const buyerNode = hasDistributionContext
      ? ctx.nodes.find((node) => node.shopId === buyerShop?.id)
      : null;
    const baseAmount = itemPlans.reduce(
      (sum, item) => sum + Number(item.variant.price ?? 0) * item.quantity,
      0,
    );
    const discountAmount = i % 9 === 0 ? Math.round(baseAmount * 0.05) : 0;
    const shippingFee = 18000 + (i % 4) * 5000;
    const platformFee = Math.round((baseAmount - discountAmount) * 0.03);
    const [orderStatus, fulfillmentStatus] =
      orderStatuses[i % orderStatuses.length];

    const order = await prisma.order.create({
      data: {
        id: id(),
        buyerUserId: buyer.id,
        buyerShopId: buyerShop?.id ?? null,
        buyerDistributionNodeId: buyerNode?.id ?? null,
        shopId: firstShop.id,
        orderStatus,
        fulfillmentStatus,
        baseAmount: money(baseAmount),
        discountAmount: money(discountAmount),
        platformFeeAmount: money(platformFee),
        buyerPayableAmount: money(baseAmount - discountAmount + shippingFee),
        sellerReceivableAmount: money(
          baseAmount - discountAmount - platformFee,
        ),
        totalAmount: money(baseAmount - discountAmount + shippingFee),
        shippingName: buyer.displayName,
        shippingPhone: buyer.phone,
        shippingAddress: `Dia chi giao hang kiem thu UAT ${String((i % 8) + 1).padStart(2, '0')}`,
        shippingDistrictId: 0,
        shippingDistrictName: 'Quan kiem thu UAT',
        shippingWardCode: `UAT-WARD-${String((i % 5) + 1).padStart(2, '0')}`,
        shippingWardName: `Phuong kiem thu UAT ${String((i % 5) + 1).padStart(2, '0')}`,
        shippingProviderCode: i % 3 === 0 ? 'GHN' : 'SELF_DELIVERY',
        shippingProviderName: i % 3 === 0 ? 'Giao Hang Nhanh' : 'Tu van chuyen',
        shippingServiceId: 53320 + (i % 5),
        shippingServiceTypeId: 2,
        shippingFeeAmount: money(shippingFee),
        shippingTrackingCode:
          orderStatus === 'pending'
            ? null
            : `UAT-TRACK-${String(i + 1).padStart(5, '0')}`,
        parcelWeightGrams: itemPlans[0].offer.parcelWeightGrams,
        parcelLengthCm: itemPlans[0].offer.parcelLengthCm,
        parcelWidthCm: itemPlans[0].offer.parcelWidthCm,
        parcelHeightCm: itemPlans[0].offer.parcelHeightCm,
        createdAt: recentDate(45 - (i % 45)),
      },
    });
    ctx.orders.push(order);

    const groups = new Map<
      string,
      {
        shopId: string;
        baseAmount: number;
        discountAmount: number;
        shippingFee: number;
        platformFee: number;
      }
    >();
    for (const [index, item] of itemPlans.entries()) {
      const shopId = item.offer.shopId;
      const group = groups.get(shopId) ?? {
        shopId,
        baseAmount: 0,
        discountAmount: 0,
        shippingFee: 0,
        platformFee: 0,
      };
      group.baseAmount += Number(item.variant.price ?? 0) * item.quantity;
      if (index === 0) {
        group.discountAmount = discountAmount;
        group.shippingFee = shippingFee;
      }
      groups.set(shopId, group);
    }

    const groupByShopId = new Map<string, (typeof ctx.orderGroups)[number]>();
    for (const groupInput of groups.values()) {
      groupInput.platformFee = Math.round(
        (groupInput.baseAmount - groupInput.discountAmount) * 0.03,
      );
      const shopGroup = await prisma.orderShopGroup.create({
        data: {
          id: id(),
          orderId: order.id,
          shopId: groupInput.shopId,
          fulfillmentStatus,
          baseAmount: money(groupInput.baseAmount),
          discountAmount: money(groupInput.discountAmount),
          platformFeeAmount: money(groupInput.platformFee),
          sellerReceivableAmount: money(
            groupInput.baseAmount -
              groupInput.discountAmount -
              groupInput.platformFee,
          ),
          shippingName: order.shippingName,
          shippingPhone: order.shippingPhone,
          shippingAddress: order.shippingAddress,
          shippingDistrictId: order.shippingDistrictId,
          shippingDistrictName: order.shippingDistrictName,
          shippingWardCode: order.shippingWardCode,
          shippingWardName: order.shippingWardName,
          shippingProviderCode: order.shippingProviderCode,
          shippingProviderName: order.shippingProviderName,
          shippingServiceId: order.shippingServiceId,
          shippingServiceTypeId: order.shippingServiceTypeId,
          shippingFeeAmount: money(groupInput.shippingFee),
          shippingTrackingCode: order.shippingTrackingCode,
          parcelWeightGrams: order.parcelWeightGrams,
          parcelLengthCm: order.parcelLengthCm,
          parcelWidthCm: order.parcelWidthCm,
          parcelHeightCm: order.parcelHeightCm,
        },
      });
      ctx.orderGroups.push(shopGroup);
      groupByShopId.set(groupInput.shopId, shopGroup);
    }

    for (const itemPlan of itemPlans) {
      const shopGroup = groupByShopId.get(itemPlan.offer.shopId);
      const orderItem = await prisma.orderItem.create({
        data: {
          id: id(),
          orderId: order.id,
          orderShopGroupId: shopGroup?.id,
          offerId: itemPlan.offer.id,
          variantId: itemPlan.variant.id,
          offerTitleSnapshot: itemPlan.offer.title,
          unitPrice: itemPlan.variant.price ?? money(0),
          quantity: itemPlan.quantity,
          shopProductDiscountAmount: money(
            Number(shopGroup?.discountAmount ?? 0),
          ),
          platformFeeAmount: money(Number(shopGroup?.platformFeeAmount ?? 0)),
        },
      });
      ctx.orderItems.push(orderItem);

      const selectedValues = await prisma.offerVariantValue.findMany({
        where: { variantId: itemPlan.variant.id },
        include: { optionValue: { include: { optionGroup: true } } },
      });
      if (selectedValues.length) {
        await prisma.orderItemOptionValue.createMany({
          data: selectedValues.map((selected) => ({
            id: id(),
            orderItemId: orderItem.id,
            optionGroupId: selected.optionValue.optionGroupId,
            optionValueId: selected.optionValueId,
            optionGroupDisplayName:
              selected.optionValue.optionGroup.displayName,
            optionValueText: selected.optionValue.text,
          })),
        });
      }
    }

    await prisma.paymentIntent.create({
      data: {
        id: id(),
        orderId: order.id,
        paymentMethod: hasDistributionContext ? 'BANK_TRANSFER' : 'COD',
        paymentStatus: ['paid', 'shipping', 'completed'].includes(orderStatus)
          ? 'PAID'
          : orderStatus === 'cancelled'
            ? 'CANCELLED'
            : 'PENDING',
        amount: order.totalAmount,
        providerRef:
          orderStatus === 'pending'
            ? null
            : `PAY-${String(i + 1).padStart(6, '0')}`,
      },
    });

    await prisma.escrow.create({
      data: {
        id: id(),
        orderId: order.id,
        escrowStatus:
          orderStatus === 'completed'
            ? 'RELEASED'
            : ['paid', 'shipping'].includes(orderStatus)
              ? 'HELD'
              : 'PENDING',
        heldAmount: ['paid', 'shipping'].includes(orderStatus)
          ? order.sellerReceivableAmount
          : money(0),
        holdAt: ['paid', 'shipping', 'completed'].includes(orderStatus)
          ? recentDate(20 - (i % 15))
          : null,
        releaseAt: orderStatus === 'completed' ? recentDate(5 - (i % 5)) : null,
      },
    });
  }

  for (let i = 0; i < COUNTS.orderItemBatchAllocations; i += 1) {
    const orderItem = pick(ctx.orderItems, i);
    const batch = pick(ctx.batches, i);
    await prisma.orderItemBatchAllocation.create({
      data: {
        id: id(),
        orderItemId: orderItem.id,
        batchId: batch.id,
        quantity: Math.max(1, Math.min(orderItem.quantity, 5)),
      },
    });
  }
}
