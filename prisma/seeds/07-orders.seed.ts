import { PrismaClient } from '@prisma/client';
import { COUNTS, id, money, pick, recentDate, SeedContext } from './00-utils';

const orderStatuses = [
  ...Array(120).fill(['completed', 'DELIVERED']),
  ...Array(30).fill(['shipping', 'SHIPPING']),
  ...Array(20).fill(['paid', 'PROCESSING']),
  ...Array(20).fill(['pending', 'PENDING']),
  ...Array(10).fill(['cancelled', 'CANCELLED']),
] as [string, string][];

export async function seedOrders(prisma: PrismaClient, ctx: SeedContext) {
  for (let i = 0; i < ctx.buyers.length; i += 1) {
  const buyer = ctx.buyers[i];

  const cart = await prisma.cart.upsert({
    where: {
      buyerUserId_cartStatus: {
        buyerUserId: buyer.id,
        cartStatus: 'ACTIVE',
      },
    },
    update: {},
    create: {
      id: id(),
      buyerUserId: buyer.id,
      cartStatus: 'ACTIVE',
    },
  });

  for (let j = 0; j < 4; j += 1) {
    const offer = pick(ctx.offers, i * 4 + j);
    const shop = ctx.shops.find((item) => item.id === offer.shopId) ?? pick(ctx.shops, i);

    await prisma.cartItem.upsert({
      where: {
        cartId_offerId: {
          cartId: cart.id,
          offerId: offer.id,
        },
      },
      update: {},
      create: {
        id: id(),
        cartId: cart.id,
        offerId: offer.id,
        quantity: 1 + (j % 3),
        offerTitleSnapshot: offer.title,
        unitPriceSnapshot: offer.price,
        currencySnapshot: offer.currency,
        shopNameSnapshot: shop.shopName,
        },
      });
    }
  }

  for (let i = 0; i < COUNTS.favoriteOffers; i += 1) {
    await prisma.userFavoriteOffer.upsert({
      where: { userId_offerId: { userId: pick(ctx.buyers, i).id, offerId: pick(ctx.offers, i).id } },
      update: {},
      create: { id: id(), userId: pick(ctx.buyers, i).id, offerId: pick(ctx.offers, i).id },
    });
  }

  for (let i = 0; i < COUNTS.orders; i += 1) {
    const offer = pick(ctx.offers, i);
    const sellerShop = ctx.shops.find((shop) => shop.id === offer.shopId) ?? pick(ctx.shops, i);
    const hasDistributionContext = i % 5 === 0;
    const qty = 1 + (i % 3);
    const baseAmount = Number(offer.price) * qty;
    const shippingFee = 18000 + (i % 4) * 5000;
    const platformFee = Math.round(baseAmount * 0.03);
    const [orderStatus, fulfillmentStatus] = orderStatuses[i];
    const buyer = pick(ctx.buyers, i);
    const buyerShop = hasDistributionContext ? pick(ctx.distributorShops, i) : null;
    const buyerNode = hasDistributionContext ? ctx.nodes.find((node) => node.shopId === buyerShop?.id) : null;

    const order = await prisma.order.create({
      data: {
        id: id(),
        buyerUserId: buyer.id,
        buyerShopId: buyerShop?.id ?? null,
        buyerDistributionNodeId: buyerNode?.id ?? null,
        shopId: sellerShop.id,
        orderStatus,
        fulfillmentStatus,
        baseAmount: money(baseAmount),
        discountAmount: money(i % 9 === 0 ? Math.round(baseAmount * 0.05) : 0),
        platformFeeAmount: money(platformFee),
        buyerPayableAmount: money(baseAmount + shippingFee),
        sellerReceivableAmount: money(baseAmount - platformFee),
        totalAmount: money(baseAmount + shippingFee),
        shippingName: buyer.displayName,
        shippingPhone: buyer.phone,
        shippingAddress: `${24 + (i % 50)} Lê Lợi, Quận ${1 + (i % 12)}, TP.HCM`,
        shippingDistrictId: 1440 + (i % 20),
        shippingDistrictName: `Quận ${1 + (i % 12)}`,
        shippingWardCode: `W${String(100 + (i % 50))}`,
        shippingWardName: `Phường ${1 + (i % 20)}`,
        shippingProviderCode: i % 3 === 0 ? 'GHN' : 'SELF_DELIVERY',
        shippingProviderName: i % 3 === 0 ? 'Giao Hàng Nhanh' : 'Tự vận chuyển',
        shippingServiceId: 53320 + (i % 5),
        shippingServiceTypeId: 2,
        shippingFeeAmount: money(shippingFee),
        shippingTrackingCode: orderStatus === 'pending' ? null : `AFK${String(i + 1).padStart(8, '0')}`,
        parcelWeightGrams: offer.parcelWeightGrams,
        parcelLengthCm: offer.parcelLengthCm,
        parcelWidthCm: offer.parcelWidthCm,
        parcelHeightCm: offer.parcelHeightCm,
        createdAt: recentDate(45 - (i % 45)),
      },
    });
    ctx.orders.push(order);

    const itemCount = i < 100 ? 2 : 1;
    for (let j = 0; j < itemCount; j += 1) {
      const itemOffer = pick(ctx.offers, i + j);
      const quantity = j === 0 ? qty : 1;
      const orderItem = await prisma.orderItem.create({
        data: {
          id: id(),
          orderId: order.id,
          offerId: itemOffer.id,
          offerTitleSnapshot: itemOffer.title,
          unitPrice: itemOffer.price,
          quantity,
        },
      });
      ctx.orderItems.push(orderItem);
    }

    await prisma.paymentIntent.create({
      data: {
        id: id(),
        orderId: order.id,
        paymentMethod: hasDistributionContext ? 'BANK_TRANSFER' : 'COD',
        paymentStatus: ['paid', 'shipping', 'completed'].includes(orderStatus) ? 'PAID' : orderStatus === 'cancelled' ? 'CANCELLED' : 'PENDING',
        amount: order.totalAmount,
        providerRef: orderStatus === 'pending' ? null : `PAY-${String(i + 1).padStart(6, '0')}`,
      },
    });

    await prisma.escrow.create({
      data: {
        id: id(),
        orderId: order.id,
        escrowStatus: orderStatus === 'completed' ? 'RELEASED' : ['paid', 'shipping'].includes(orderStatus) ? 'HELD' : 'PENDING',
        heldAmount: ['paid', 'shipping'].includes(orderStatus) ? order.sellerReceivableAmount : money(0),
        holdAt: ['paid', 'shipping', 'completed'].includes(orderStatus) ? recentDate(20 - (i % 15)) : null,
        releaseAt: orderStatus === 'completed' ? recentDate(5 - (i % 5)) : null,
      },
    });
  }

  for (let i = 0; i < COUNTS.orderItemBatchAllocations; i += 1) {
    const orderItem = pick(ctx.orderItems, i);
    const batch = pick(ctx.batches, i);
    await prisma.orderItemBatchAllocation.create({
      data: { id: id(), orderItemId: orderItem.id, batchId: batch.id, quantity: Math.max(1, Math.min(orderItem.quantity, 5)) },
    });
  }
}
