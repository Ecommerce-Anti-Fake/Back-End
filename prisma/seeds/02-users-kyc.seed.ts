import { PrismaClient } from '@prisma/client';
import {
  COUNTS,
  avatarUrl,
  createMediaAsset,
  documentUrl,
  hashPassword,
  id,
  phone,
  recentDate,
  SeedContext,
  sha256,
} from './00-utils';

const names = [
  'Nguyễn Minh Anh',
  'Trần Quốc Bảo',
  'Lê Hoàng Duy',
  'Phạm Gia Hân',
  'Hoàng Tuấn Kiệt',
  'Võ Ngọc Linh',
  'Đặng Nhật Nam',
  'Bùi Phương Nhi',
  'Đỗ Thanh Phong',
  'Ngô Hải Yến',
  'Công ty Việt An',
  'Công ty An Phát',
  'Công ty Sao Mai',
  'Công ty Hưng Thịnh',
  'Công ty Đại Nam',
  'Công ty Minh Long',
  'Affiliate Mai Lan',
  'Affiliate Thành Đạt',
  'Quản trị viên AntiFake',
  'Admin Kiểm Duyệt',
];

export async function seedUsersAndKyc(prisma: PrismaClient, ctx: SeedContext) {
  const password = hashPassword('12345678');

  for (let i = 0; i < COUNTS.users; i += 1) {
    const role = i === 2 ? 'admin' : 'user';
    let user = await prisma.user.create({
      data: {
        id: id(),
        email: `seed.user${String(i + 1).padStart(2, '0')}@antifake.local`,
        phone: phone(i + 1),
        displayName: names[i],
        password,
        role,
        accountStatus: i === 7 ? 'suspended' : 'active',
        createdAt: recentDate(60 - i),
      },
    });

    const avatar = await createMediaAsset(prisma, {
      ownerUserId: user.id,
      resourceType: 'USER_AVATAR',
      secureUrl: avatarUrl(user.id),
      publicId: `seed/users/${user.id}/avatar`,
      folder: 'seed/users/avatars',
    });
    user = await prisma.user.update({
      where: { id: user.id },
      data: { avatarMediaId: avatar.id },
    });
    ctx.users.push(user);

    if (role === 'admin') ctx.admins.push(user);
    else if (i < 2) ctx.shopOwners.push(user);
    else ctx.affiliateUsers.push(user);
  }

  while (ctx.affiliateUsers.length < 6) ctx.affiliateUsers.push(ctx.users[ctx.affiliateUsers.length + 2]);

  for (let i = 0; i < COUNTS.userAddresses; i += 1) {
    const user = ctx.users[i % ctx.users.length];
    await prisma.userAddress.create({
      data: {
        id: id(),
        userId: user.id,
        recipientName: user.displayName ?? `Người nhận ${i + 1}`,
        phone: user.phone ?? phone(i + 100),
        addressLine: `${12 + i} Nguyễn Trãi, Phường ${1 + (i % 10)}, Quận ${1 + (i % 12)}, TP.HCM`,
        isDefault: i < ctx.users.length,
        createdAt: recentDate(45 - (i % 30)),
      },
    });
  }

  for (let i = 0; i < COUNTS.authSessions; i += 1) {
    await prisma.authSession.create({
      data: {
        id: id(),
        userId: ctx.users[i].id,
        tokenFamily: `seed-family-${i + 1}`,
        currentTokenId: id(),
        currentTokenHash: sha256(`refresh-token-${i}`),
        expiresAt: recentDate(-14),
        lastUsedAt: recentDate(i % 4),
      },
    });
  }

  for (let i = 0; i < COUNTS.passwordResetTokens; i += 1) {
    await prisma.passwordResetToken.create({
      data: {
        id: id(),
        userId: ctx.users[i + 2].id,
        tokenHash: sha256(`reset-token-${i}`),
        expiresAt: recentDate(i - 2),
        usedAt: i % 2 === 0 ? recentDate(i) : null,
      },
    });
  }

  for (let i = 0; i < COUNTS.userKyc; i += 1) {
    const user = ctx.users[i];
    const status = i < 8 ? 'verified' : i < 10 ? 'pending' : 'rejected';
    const kyc = await prisma.userKyc.create({
      data: {
        id: id(),
        userId: user.id,
        fullName: user.displayName ?? `Seed User ${i + 1}`,
        dateOfBirth: new Date(1990 + (i % 12), i % 12, 10 + (i % 18)),
        kycLevel: i < 8 ? 'level_2' : 'level_1',
        idType: 'CCCD',
        idNumberHash: sha256(`cccd-${i + 1}`),
        verificationStatus: status,
        verifiedAt: status === 'verified' ? recentDate(30 - i) : null,
        reviewNote: status === 'rejected' ? 'Ảnh giấy tờ chưa rõ, vui lòng gửi lại.' : null,
      },
    });

    const submission = await prisma.userKycSubmission.create({
      data: {
        id: id(),
        userKycId: kyc.id,
        submissionNumber: 1,
        verificationStatus: status,
        reviewNote: status === 'rejected' ? 'Thông tin chưa khớp hồ sơ.' : null,
        reviewedAt: status === 'pending' ? null : recentDate(25 - i),
        submittedAt: recentDate(35 - i),
      },
    });

    for (const side of ['FRONT', 'BACK'] as const) {
      const media = await createMediaAsset(prisma, {
        ownerUserId: user.id,
        resourceType: 'KYC_DOCUMENT',
        secureUrl: documentUrl(`kyc-${user.id}-${side}`),
        publicId: `seed/kyc/${user.id}/${side.toLowerCase()}`,
        mimeType: 'application/pdf',
        assetType: 'RAW',
      });

      await prisma.userKycDocument.create({
        data: { id: id(), userKycId: kyc.id, mediaAssetId: media.id, side },
      });
      await prisma.userKycSubmissionDocument.create({
        data: { id: id(), submissionId: submission.id, mediaAssetId: media.id, side },
      });
    }
  }

  for (let i = COUNTS.userKyc; i < COUNTS.userKycSubmissions; i += 1) {
    const kyc = await prisma.userKyc.findFirst({ skip: i % COUNTS.userKyc });
    if (!kyc) continue;
    await prisma.userKycSubmission.create({
      data: {
        id: id(),
        userKycId: kyc.id,
        submissionNumber: 2 + (i % 2),
        verificationStatus: i % 2 === 0 ? 'pending' : 'rejected',
        reviewNote: i % 2 === 0 ? null : 'Cần bổ sung ảnh mặt sau rõ hơn.',
        submittedAt: recentDate(10 - (i % 5)),
      },
    });
  }
}
