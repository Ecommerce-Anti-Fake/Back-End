import { PrismaClient } from '@prisma/client';
import {
  COUNTS,
  createMediaAsset,
  id,
  imageUrl,
  pick,
  recentDate,
  SeedContext,
} from './00-utils';

const comments = [
  'Sản phẩm đúng mô tả, đóng gói kỹ và có tem xác thực rõ ràng.',
  'Giao hàng nhanh, quét QR ra đầy đủ thông tin nguồn gốc.',
  'Chất lượng ổn, shop phản hồi nhanh.',
  'Bao bì đẹp, hạn sử dụng rõ ràng.',
  'Hơi chậm vận chuyển nhưng sản phẩm tốt.',
  'Cần cải thiện đóng gói bên ngoài.',
];

export async function seedReviewsDisputes(
  prisma: PrismaClient,
  ctx: SeedContext,
) {
  const completedOrders = ctx.orders.filter(
    (order) => order.orderStatus === 'completed',
  );
  const usedOrderItemIds = new Set<string>();
  for (let i = 0; i < COUNTS.reviews; i += 1) {
    const order = pick(completedOrders, i);
    const orderItem = ctx.orderItems.find(
      (item) => item.orderId === order.id && !usedOrderItemIds.has(item.id),
    );
    if (!orderItem) continue;
    usedOrderItemIds.add(orderItem.id);
    const shop =
      ctx.shops.find((item) => item.id === order.shopId) ?? pick(ctx.shops, i);
    const rating = i < 65 ? 5 : i < 85 ? 4 : i < 93 ? 3 : i < 97 ? 2 : 1;
    const review = await prisma.review.create({
      data: {
        id: id(),
        orderId: order.id,
        orderItemId: orderItem.id,
        fromUserId: order.buyerUserId ?? pick(ctx.buyers, i).id,
        toUserId: shop.ownerUserId,
        rating,
        comment: comments[i % comments.length],
        createdAt: recentDate(20 - (i % 18)),
      },
    });

    if (i < COUNTS.reviewMedia) {
      const media = await createMediaAsset(prisma, {
        ownerUserId: order.buyerUserId ?? pick(ctx.buyers, i).id,
        resourceType: 'REVIEW_IMAGE',
        secureUrl: imageUrl(`review-${review.id}`, 900, 900),
        publicId: `uat/reviews/${review.id}`,
      });
      await prisma.reviewMedia.create({
        data: {
          id: id(),
          reviewId: review.id,
          mediaAssetId: media.id,
          fileUrl: media.secureUrl,
          mimeType: media.mimeType,
          publicId: media.publicId,
        },
      });
    }
  }

  for (let i = 0; i < COUNTS.disputes; i += 1) {
    const order = pick(
      ctx.orders.filter((item) => item.orderStatus !== 'pending'),
      i,
    );
    const dispute = await prisma.dispute.create({
      data: {
        id: id(),
        orderId: order.id,
        openedByUserId: order.buyerUserId ?? pick(ctx.buyers, i).id,
        reason:
          i % 2 === 0
            ? 'Sản phẩm nhận được không giống mô tả'
            : 'Nghi ngờ mã QR bị sử dụng lại',
        disputeStatus: i < 3 ? 'open' : i < 7 ? 'reviewing' : 'resolved',
        openedAt: recentDate(15 - i),
        resolvedAt: i >= 7 ? recentDate(5 - (i % 3)) : null,
      },
    });

    for (let j = 0; j < 3; j += 1) {
      const media = await createMediaAsset(prisma, {
        ownerUserId: order.buyerUserId ?? pick(ctx.buyers, i).id,
        resourceType: 'DISPUTE_EVIDENCE',
        secureUrl: imageUrl(`dispute-${dispute.id}-${j}`, 900, 900),
        publicId: `uat/disputes/${dispute.id}/${j}`,
      });
      await prisma.disputeEvidence.create({
        data: {
          id: id(),
          disputeId: dispute.id,
          uploadedByUserId: order.buyerUserId ?? pick(ctx.buyers, i).id,
          mediaAssetId: media.id,
          fileType: 'image/jpeg',
          fileUrl: media.secureUrl,
        },
      });
    }
  }
}
