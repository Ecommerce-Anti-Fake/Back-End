import { PrismaClient } from '@prisma/client';
import { requiredUatSecret } from '../../scripts/uat/uat-safety';
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

function userName(index: number) {
  return `Nguoi dung Demo UAT ${String(index + 1).padStart(2, '0')}`;
}

function userEmail(index: number, role: string) {
  if (role === 'admin') return 'admin-uat@antifake.local';
  if (index === 0) return 'buyer-uat@antifake.local';
  if (index === 1) return 'seller-uat@antifake.local';
  if (index === 2) return 'affiliate-uat@antifake.local';
  return `demo-user-${String(index + 1).padStart(2, '0')}@antifake.local`;
}

export async function seedUsersAndKyc(prisma: PrismaClient, ctx: SeedContext) {
  const password = hashPassword(requiredUatSecret('UAT_TEST_PASSWORD'));

  for (let i = 0; i < COUNTS.users; i += 1) {
    const role = i === COUNTS.users - 1 ? 'admin' : 'user';
    const name = userName(i);
    const email = userEmail(i, role);
    const isReadyForSeedLogin = role === 'admin' || i < 2;
    let user = await prisma.user.create({
      data: {
        id: id(),
        email,
        phone: phone(i + 1),
        displayName: name,
        password,
        role,
        accountStatus: 'active',
        emailVerifiedAt: isReadyForSeedLogin ? recentDate(30) : null,
        phoneVerifiedAt: isReadyForSeedLogin ? recentDate(30) : null,
        createdAt: recentDate(60 - i),
      },
    });

    const avatar = await createMediaAsset(prisma, {
      ownerUserId: user.id,
      resourceType: 'USER_AVATAR',
      secureUrl: avatarUrl(`uat-user-${i + 1}`),
      publicId: `uat/users/${i + 1}/avatar`,
      folder: 'uat/users/avatars',
    });
    user = await prisma.user.update({
      where: { id: user.id },
      data: { avatarMediaId: avatar.id },
    });
    ctx.users.push(user);

    if (role === 'admin') ctx.admins.push(user);
    else {
      ctx.buyers.push(user);
      if (i < 2) ctx.shopOwners.push(user);
      ctx.affiliateUsers.push(user);
    }
  }

  while (ctx.affiliateUsers.length < 6)
    ctx.affiliateUsers.push(ctx.users[ctx.affiliateUsers.length]);

  for (let i = 0; i < COUNTS.userAddresses; i += 1) {
    const user = ctx.users[i % ctx.users.length];
    await prisma.userAddress.create({
      data: {
        id: id(),
        userId: user.id,
        recipientName: user.displayName ?? `Nguoi nhan Demo UAT ${i + 1}`,
        phone: user.phone ?? phone(i + 100),
        provinceCode: 'UAT-PROVINCE',
        provinceName: 'Tinh kiem thu UAT',
        wardCode: `UAT-WARD-${String((i % 5) + 1).padStart(2, '0')}`,
        wardName: `Phuong kiem thu UAT ${String((i % 5) + 1).padStart(2, '0')}`,
        addressLine: `Dia chi giao hang kiem thu UAT ${String(i + 1).padStart(2, '0')}`,
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
        tokenFamily: `uat-family-${i + 1}`,
        currentTokenId: id(),
        currentTokenHash: sha256(`uat-refresh-token-${i}`),
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
        tokenHash: sha256(`uat-reset-token-${i}`),
        expiresAt: recentDate(i - 2),
        usedAt: i % 2 === 0 ? recentDate(i) : null,
      },
    });
  }

  for (let i = 0; i < COUNTS.userKyc; i += 1) {
    const user = ctx.users[i];
    const status = i === 2 ? 'pending' : 'approved';
    const kyc = await prisma.userKyc.create({
      data: {
        id: id(),
        userId: user.id,
        fullName: user.displayName ?? userName(i),
        dateOfBirth: new Date(1990 + (i % 12), i % 12, 10 + (i % 18)),
        kycLevel: status === 'approved' ? 'level_2' : 'level_1',
        idType: 'UAT_DOCUMENT',
        idNumberHash: sha256(`uat-document-${i + 1}`),
        verificationStatus: status,
        verifiedAt: status === 'approved' ? recentDate(30 - i) : null,
        reviewNote: null,
      },
    });

    const submission = await prisma.userKycSubmission.create({
      data: {
        id: id(),
        userKycId: kyc.id,
        submissionNumber: 1,
        verificationStatus: status,
        reviewNote: null,
        reviewedAt: status === 'pending' ? null : recentDate(25 - i),
        submittedAt: recentDate(35 - i),
      },
    });

    for (const side of ['FRONT', 'BACK'] as const) {
      const media = await createMediaAsset(prisma, {
        ownerUserId: user.id,
        resourceType: 'KYC_DOCUMENT',
        secureUrl: documentUrl(`uat-kyc-${i + 1}-${side}`),
        publicId: `uat/kyc/${i + 1}/${side.toLowerCase()}`,
        mimeType: 'application/pdf',
        assetType: 'RAW',
      });

      await prisma.userKycDocument.create({
        data: { id: id(), userKycId: kyc.id, mediaAssetId: media.id, side },
      });
      await prisma.userKycSubmissionDocument.create({
        data: {
          id: id(),
          submissionId: submission.id,
          mediaAssetId: media.id,
          side,
        },
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
        reviewNote: i % 2 === 0 ? null : 'Bo sung tai lieu kiem thu UAT.',
        submittedAt: recentDate(10 - (i % 5)),
      },
    });
  }
}
