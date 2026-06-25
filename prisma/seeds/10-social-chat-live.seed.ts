import { LiveSessionStatus, PrismaClient, SocialPostType } from '@prisma/client';
import { COUNTS, createMediaAsset, id, imageUrl, pick, recentDate, SeedContext } from './00-utils';

export async function seedSocialChatLive(prisma: PrismaClient, ctx: SeedContext) {
  const posts: { id: string }[] = [];
  const comments: { id: string; authorUserId: string }[] = [];
  for (let i = 0; i < COUNTS.socialPosts; i += 1) {
    const offer = pick(ctx.offers, i);
    const shop = ctx.shops.find((item) => item.id === offer.shopId) ?? pick(ctx.shops, i);
    const post = await prisma.socialPost.create({
      data: {
        id: id(),
        authorUserId: shop.ownerUserId,
        authorShopId: shop.id,
        offerId: offer.id,
        postType: i % 3 === 0 ? SocialPostType.QUESTION : i % 3 === 1 ? SocialPostType.PRODUCT_SHARE : SocialPostType.SHARE,
        body:
          i % 3 === 0
            ? `Sản phẩm này có thể xác thực nguồn gốc bằng QR như thế nào?\n\nẢnh minh họa: ${imageUrl(`social-post-${i}`, 1200, 675)}`
            : `Khám phá ${offer.title} với tem xác thực AntiFake và hồ sơ nguồn gốc rõ ràng.\n\nẢnh minh họa: ${imageUrl(`social-post-${i}`, 1200, 675)}`,
        visibility: i % 13 === 0 ? 'HIDDEN' : 'PUBLIC',
        hiddenAt: i % 13 === 0 ? recentDate(3) : null,
        hiddenByUserId: i % 13 === 0 ? pick(ctx.admins, i).id : null,
        createdAt: recentDate(20 - i),
      },
    });
    posts.push(post);

    await createMediaAsset(prisma, {
      ownerUserId: shop.ownerUserId,
      resourceType: 'PRODUCT_IMAGE',
      secureUrl: imageUrl(`social-post-${post.id}`, 1200, 675),
      publicId: `seed/social-posts/${post.id}/cover`,
      folder: 'seed/social-posts',
    });
  }

  for (let i = 0; i < COUNTS.socialComments; i += 1) {
    const comment = await prisma.socialComment.create({
      data: {
        id: id(),
        postId: pick(posts, i).id,
        authorUserId: pick(ctx.users, i).id,
        body: socialCommentBody(i),
        visibility: 'PUBLIC',
        createdAt: recentDate(10 - (i % 10)),
      },
    });
    comments.push(comment);
  }

  for (let i = 0; i < COUNTS.socialCommentLikes; i += 1) {
    const comment = pick(comments, i);
    const liker = pick(ctx.users, i + 4);
    if (liker.id === comment.authorUserId) continue;
    await prisma.socialCommentLike.upsert({
      where: { commentId_userId: { commentId: comment.id, userId: liker.id } },
      update: {},
      create: {
        id: id(),
        commentId: comment.id,
        userId: liker.id,
        createdAt: recentDate(8 - (i % 8)),
      },
    });
  }

  for (let i = 0; i < COUNTS.socialCommentReplies; i += 1) {
    const comment = pick(comments, i);
    await prisma.socialCommentReply.create({
      data: {
        id: id(),
        commentId: comment.id,
        authorUserId: pick(ctx.users, i + 7).id,
        body: socialCommentReplyBody(i),
        visibility: i % 31 === 0 ? 'HIDDEN' : 'PUBLIC',
        createdAt: recentDate(7 - (i % 7)),
      },
    });
  }

  for (let i = 0; i < COUNTS.socialReactions; i += 1) {
    await prisma.socialReaction.upsert({
      where: { postId_userId_reactionType: { postId: pick(posts, i).id, userId: pick(ctx.users, i).id, reactionType: 'LIKE' } },
      update: {},
      create: { id: id(), postId: pick(posts, i).id, userId: pick(ctx.users, i).id, reactionType: 'LIKE' },
    });
  }

  for (let i = 0; i < COUNTS.socialShares; i += 1) {
    await prisma.socialShare.upsert({
      where: { postId_userId: { postId: pick(posts, i).id, userId: pick(ctx.users, i + 3).id } },
      update: {},
      create: { id: id(), postId: pick(posts, i).id, userId: pick(ctx.users, i + 3).id },
    });
  }

  for (let i = 0; i < COUNTS.chatThreads; i += 1) {
    const shop = pick(ctx.shops, i);
    const buyer = pick(ctx.buyers, i);
    const thread = await prisma.chatThread.upsert({
      where: { buyerUserId_shopId: { buyerUserId: buyer.id, shopId: shop.id } },
      update: {},
      create: { id: id(), shopId: shop.id, buyerUserId: buyer.id, sellerUserId: shop.ownerUserId, createdAt: recentDate(15 - (i % 10)) },
    });

    for (let j = 0; j < 10; j += 1) {
      const fromBuyer = j % 2 === 0;
      const hasImage = j === 3 || j === 7;
      const chatImageUrl = hasImage ? imageUrl(`chat-${thread.id}-${j}`, 900, 900) : null;

      if (hasImage) {
        await createMediaAsset(prisma, {
          ownerUserId: fromBuyer ? buyer.id : shop.ownerUserId,
          resourceType: 'PRODUCT_IMAGE',
          secureUrl: chatImageUrl!,
          publicId: `seed/chats/${thread.id}/${j}`,
          folder: 'seed/chats',
        });
      }

      await prisma.chatMessage.create({
        data: {
          id: id(),
          threadId: thread.id,
          senderUserId: fromBuyer ? buyer.id : shop.ownerUserId,
          clientMessageId: `seed-${i}-${j}`,
          messageType: hasImage ? 'image' : 'text',
          body: hasImage
            ? chatImageUrl!
            : fromBuyer
              ? 'Shop ơi sản phẩm này có tem QR xác thực không?'
              : 'Dạ có, khi nhận hàng anh/chị có thể quét QR để xem nguồn gốc lô hàng.',
          sentAt: recentDate(9 - (j % 5)),
        },
      });
    }
  }

  const sessions: { id: string; shopId: string }[] = [];
  for (let i = 0; i < COUNTS.liveSessions; i += 1) {
    const shop = pick(ctx.shops, i);
    const status = [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE, LiveSessionStatus.ENDED, LiveSessionStatus.CANCELLED][i % 4];
    const session = await prisma.liveCommerceSession.create({
      data: {
        id: id(),
        shopId: shop.id,
        title: `Livestream kiểm hàng chính hãng #${i + 1}`,
        description: 'Giới thiệu sản phẩm có tem QR, hướng dẫn kiểm tra nguồn gốc và ưu đãi live.',
        coverUrl: imageUrl(`live-${i}`, 1200, 675),
        startAt: status === LiveSessionStatus.SCHEDULED ? recentDate(-3 - i) : recentDate(8 - i),
        status,
        playbackUrl: status === LiveSessionStatus.ENDED ? `https://cdn.antifake.local/live/${i}/playback.m3u8` : null,
        streamProvider: 'seed-webrtc',
        streamProviderSessionId: `live-seed-${i + 1}`,
        streamIngestUrl: status === LiveSessionStatus.LIVE ? `rtmp://live.antifake.local/seed/${i + 1}` : null,
        streamLatencyTargetMs: 3000,
        recordingUrl: status === LiveSessionStatus.ENDED ? `https://cdn.antifake.local/live/${i}/recording.mp4` : null,
        recordingRetentionDays: 30,
      },
    });
    sessions.push(session);
  }

  for (let i = 0; i < COUNTS.liveSessionOffers; i += 1) {
    await prisma.liveSessionOffer.upsert({
      where: { sessionId_offerId: { sessionId: pick(sessions, i).id, offerId: pick(ctx.offers, i).id } },
      update: {},
      create: { id: id(), sessionId: pick(sessions, i).id, offerId: pick(ctx.offers, i).id, sortOrder: i % 5 },
    });
  }

  for (let i = 0; i < COUNTS.liveSessionReminders; i += 1) {
    await prisma.liveSessionReminder.upsert({
      where: { sessionId_userId: { sessionId: pick(sessions, i).id, userId: pick(ctx.users, i).id } },
      update: {},
      create: { id: id(), sessionId: pick(sessions, i).id, userId: pick(ctx.users, i).id },
    });
  }

  for (let i = 0; i < COUNTS.liveSessionComments; i += 1) {
    await prisma.liveSessionComment.create({
      data: {
        id: id(),
        sessionId: pick(sessions, i).id,
        authorUserId: pick(ctx.users, i).id,
        body: liveSessionCommentBody(i),
        visibility: i % 20 === 0 ? 'HIDDEN' : 'PUBLIC',
        clientMessageId: `live-msg-${i}`,
        hiddenAt: i % 20 === 0 ? recentDate(1) : null,
        hiddenByUserId: i % 20 === 0 ? pick(ctx.admins, i).id : null,
        createdAt: recentDate(3 - (i % 3)),
      },
    });
  }
}

function socialCommentBody(index: number) {
  const samples = [
    'Da quet QR, tem tra ve dung lo san xuat va han su dung nen minh yen tam hon.',
    'Shop goi hang can than, ma QR tren hop con nguyen va quet ra nguon goc ro rang.',
    'Minh mua cho gia dinh, khi nhan hang kiem tra duoc thong tin nha san xuat ngay.',
    'San pham nay co can giu hoa don de doi chieu bao hanh khong shop?',
    'Thong tin huu ich, lan sau minh se quet QR truoc khi xac nhan da nhan hang.',
    'Shop co the chup them tem chong gia tren tung lo san xuat duoc khong?',
    'Hang giao nhanh, ma xac thuc khop voi ten san pham tren he thong.',
    'Minh thay phan truy xuat nguon goc rat can thiet voi cac mat hang tieu dung.',
    'Neu QR da bi rach thi co cach nao kiem tra lai bang so seri khong?',
    'Da mua lan thu hai, lan nao quet tem cung hien thong tin day du.',
  ];
  return samples[index % samples.length];
}

function socialCommentReplyBody(index: number) {
  const samples = [
    'Cam on ban da chia se, minh cung vua quet thu va thay thong tin lo hang rat ro.',
    'Shop minh co ho tro doi chieu bang ma seri neu tem bi tray nhe.',
    'Dung roi, nen quet QR ngay khi nhan de tranh nham hang trong qua trinh giao.',
    'Ben minh se bo sung anh tem tren tung lo trong bai dang tiep theo.',
    'Hoa don van nen giu lai de doi chieu khi can bao hanh hoac doi tra.',
    'Ma xac thuc chi hop le mot lan kiem tra chinh, nen can bao quan tem can than.',
    'Minh cung thich phan hien thi nguon goc, nhin minh bach hon nhieu.',
    'Neu co dau hieu tem bi dan lai thi nen bao cao ngay tren he thong.',
  ];
  return samples[index % samples.length];
}

function liveSessionCommentBody(index: number) {
  const samples = [
    'Ma QR nay kiem tra duoc toi lo san xuat luon ha shop?',
    'Co uu dai cho combo trong live khong shop?',
    'Shop quay can canh tem xac thuc tren hop giup minh nhe.',
    'Neu dat trong live thi co kem hoa don dien tu khong?',
  ];
  return samples[index % samples.length];
}
