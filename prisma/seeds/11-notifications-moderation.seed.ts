import { PrismaClient } from '@prisma/client';
import { COUNTS, id, pick, recentDate, SeedContext, sha256 } from './00-utils';

const notificationTypes = [
  ['ORDER_CREATED', 'Đơn hàng mới', 'Đơn hàng của bạn đã được tạo thành công.'],
  ['PAYMENT_PAID', 'Thanh toán thành công', 'Thanh toán đã được ghi nhận trong hệ thống.'],
  ['VERIFY_QR', 'Xác thực QR', 'Mã QR đã được xác thực nguồn gốc.'],
  ['SHOP_REVIEW', 'Hồ sơ shop', 'Hồ sơ shop đã được cập nhật trạng thái.'],
  ['AFFILIATE_COMMISSION', 'Hoa hồng affiliate', 'Bạn có hoa hồng mới từ đơn hàng hợp lệ.'],
] as const;

export async function seedNotificationsModeration(prisma: PrismaClient, ctx: SeedContext) {
  const notifications: { id: string; userId: string }[] = [];
  for (let i = 0; i < COUNTS.notifications; i += 1) {
    const user = pick(ctx.users, i);
    const [type, title, body] = notificationTypes[i % notificationTypes.length];
    const target = i % 3 === 0 ? pick(ctx.orders, i) : i % 3 === 1 ? pick(ctx.offers, i) : pick(ctx.shops, i);
    const notification = await prisma.notification.create({
      data: {
        id: id(),
        userId: user.id,
        notificationType: type,
        title,
        body,
        targetType: i % 3 === 0 ? 'ORDER' : i % 3 === 1 ? 'OFFER' : 'SHOP',
        targetId: target.id,
        dedupeKey: `seed-${type}-${i + 1}`,
        readAt: i % 4 === 0 ? recentDate(2 - (i % 2)) : null,
        createdAt: recentDate(20 - (i % 20)),
      },
    });
    notifications.push(notification);
  }

  for (let i = 0; i < COUNTS.notificationFcmTokens; i += 1) {
    await prisma.notificationFcmToken.create({
      data: {
        id: id(),
        userId: pick(ctx.users, i).id,
        tokenHash: sha256(`fcm-token-${i}`),
        token: `seed-fcm-token-${i + 1}`,
        deviceId: `seed-device-${i + 1}`,
        userAgent: i % 2 === 0 ? 'Chrome Windows' : 'Mobile Safari',
        revokedAt: i % 10 === 0 ? recentDate(1) : null,
      },
    });
  }

  for (let i = 0; i < COUNTS.notificationDeliveryAttempts; i += 1) {
    const notification = pick(notifications, i);
    await prisma.notificationDeliveryAttempt.create({
      data: {
        id: id(),
        userId: notification.userId,
        notificationId: notification.id,
        eventName: `seed.notification.${i % 5}`,
        provider: i % 2 === 0 ? 'SSE' : 'FCM',
        status: i % 12 === 0 ? 'FAILED' : 'SENT',
        errorCode: i % 12 === 0 ? 'SEED_TEMPORARY_ERROR' : null,
        errorMessage: i % 12 === 0 ? 'Seed simulated delivery failure.' : null,
        createdAt: recentDate(15 - (i % 15)),
      },
    });
  }

  for (let i = 0; i < COUNTS.reports; i += 1) {
    const target = i % 2 === 0 ? pick(ctx.offers, i) : pick(ctx.shops, i);
    await prisma.report.create({
      data: {
        id: id(),
        reporterUserId: pick(ctx.buyers, i).id,
        targetType: i % 2 === 0 ? 'OFFER' : 'SHOP',
        targetId: target.id,
        reason: i % 2 === 0 ? 'Nghi ngờ sản phẩm giả hoặc mô tả sai.' : 'Shop có thông tin hồ sơ chưa rõ ràng.',
        reportStatus: i % 4 === 0 ? 'open' : i % 4 === 1 ? 'reviewing' : 'resolved',
        createdAt: recentDate(18 - (i % 12)),
      },
    });
  }

  for (let i = 0; i < COUNTS.moderationCases; i += 1) {
    const target = pick(ctx.offers, i);
    await prisma.moderationCase.create({
      data: {
        id: id(),
        targetType: i % 2 === 0 ? 'OFFER' : 'SOCIAL_POST',
        targetId: target.id,
        reason: i % 2 === 0 ? 'Nội dung sản phẩm cần kiểm duyệt.' : 'Bình luận/bài viết có dấu hiệu vi phạm.',
        caseStatus: i < 4 ? 'open' : i < 8 ? 'reviewing' : 'resolved',
        internalNote: 'Seed moderation case cho dashboard admin.',
        assignedAdminUserId: pick(ctx.admins, i).id,
        createdAt: recentDate(12 - i),
        resolvedAt: i >= 8 ? recentDate(2) : null,
      },
    });
  }

  const auditTargets = [
    ...ctx.orders.map((item) => ['ORDER', item.id] as const),
    ...ctx.offers.map((item) => ['OFFER', item.id] as const),
    ...ctx.shops.map((item) => ['SHOP', item.id] as const),
  ];
  for (let i = 0; i < COUNTS.auditLogs; i += 1) {
    const [targetType, targetId] = pick(auditTargets, i);
    await prisma.auditLog.create({
      data: {
        id: id(),
        targetType,
        targetId,
        actorUserId: pick(ctx.admins.length ? ctx.admins : ctx.users, i).id,
        action: i % 3 === 0 ? 'STATUS_CHANGED' : i % 3 === 1 ? 'DOCUMENT_REVIEWED' : 'SEED_CREATED',
        fromStatus: i % 3 === 0 ? 'pending' : null,
        toStatus: i % 3 === 0 ? 'approved' : null,
        note: 'Seed audit log phục vụ kiểm thử lịch sử thao tác.',
        metadata: { source: 'seed', index: i },
        createdAt: recentDate(30 - (i % 30)),
      },
    });
  }
}
