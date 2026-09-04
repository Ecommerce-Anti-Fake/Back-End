import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  assertUatDemoDatabaseTarget,
  assertUatDemoSyntheticDataConfirmed,
  requiredUatSecret,
} from './uat-safety';
import { loadUatEnv } from './load-uat-env';
import { DEMO_FIXTURE_IDS, DEMO_FIXTURE_NAMES } from './demo-fixture-contract';

function requireCleanupApproval() {
  if (process.env.UAT_DEMO_CLEANUP_APPROVED?.trim().toLowerCase() !== 'true') {
    throw new Error(
      'UAT_DEMO_CLEANUP_APPROVED=true is required for demo fixture cleanup',
    );
  }
}

function assertReservedText(
  value: string | null | undefined,
  expected: string,
  field: string,
) {
  if (value === null || value === undefined) return;
  if (value !== expected) {
    throw new Error(`Reserved DOCS_UAT cleanup row mismatch: ${field}`);
  }
}

async function main() {
  loadUatEnv();
  requireCleanupApproval();
  const databaseTarget = assertUatDemoDatabaseTarget();
  assertUatDemoSyntheticDataConfirmed();
  const connectionString = requiredUatSecret('DATABASE_URL');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [
      shop,
      offer,
      voucher,
      batch,
      chat,
      post,
      program,
      code,
      wallet,
      reviewUser,
      reviewShop,
      reviewOffer,
    ] = await Promise.all([
      prisma.shop.findUnique({
        where: { id: DEMO_FIXTURE_IDS.shop },
        select: { shopName: true },
      }),
      prisma.offer.findUnique({
        where: { id: DEMO_FIXTURE_IDS.offer },
        select: { title: true },
      }),
      prisma.voucher.findUnique({
        where: { id: DEMO_FIXTURE_IDS.voucher },
        select: { code: true },
      }),
      prisma.supplyBatch.findUnique({
        where: { id: DEMO_FIXTURE_IDS.batch },
        select: { batchNumber: true },
      }),
      prisma.chatThread.findUnique({
        where: { id: DEMO_FIXTURE_IDS.chatThread },
        select: { directParticipantKey: true },
      }),
      prisma.socialPost.findUnique({
        where: { id: DEMO_FIXTURE_IDS.communityPost },
        select: { body: true },
      }),
      prisma.affiliateProgram.findUnique({
        where: { id: DEMO_FIXTURE_IDS.affiliateProgram },
        select: { slug: true },
      }),
      prisma.affiliateCode.findUnique({
        where: { id: DEMO_FIXTURE_IDS.affiliateCode },
        select: { code: true },
      }),
      prisma.wallet.findUnique({
        where: { id: DEMO_FIXTURE_IDS.wallet },
        select: { walletCode: true },
      }),
      prisma.user.findUnique({
        where: { id: DEMO_FIXTURE_IDS.reviewUser },
        select: { email: true },
      }),
      prisma.shop.findUnique({
        where: { id: DEMO_FIXTURE_IDS.reviewShop },
        select: { shopName: true },
      }),
      prisma.offer.findUnique({
        where: { id: DEMO_FIXTURE_IDS.reviewOffer },
        select: { title: true },
      }),
    ]);

    assertReservedText(shop?.shopName, DEMO_FIXTURE_NAMES.shop, 'shop');
    assertReservedText(offer?.title, DEMO_FIXTURE_NAMES.offer, 'offer');
    assertReservedText(
      voucher?.code,
      DEMO_FIXTURE_NAMES.voucherCode,
      'voucher',
    );
    assertReservedText(
      batch?.batchNumber,
      DEMO_FIXTURE_NAMES.batchNumber,
      'batch',
    );
    assertReservedText(
      chat?.directParticipantKey,
      DEMO_FIXTURE_NAMES.chatKey,
      'chat',
    );
    assertReservedText(
      post?.body,
      DEMO_FIXTURE_NAMES.communityBody,
      'community post',
    );
    assertReservedText(
      program?.slug,
      DEMO_FIXTURE_NAMES.affiliateSlug,
      'affiliate program',
    );
    assertReservedText(
      code?.code,
      DEMO_FIXTURE_NAMES.affiliateCode,
      'affiliate code',
    );
    assertReservedText(wallet?.walletCode, 'DOCS-UAT-WALLET-SHOP', 'wallet');
    assertReservedText(
      reviewUser?.email,
      DEMO_FIXTURE_NAMES.reviewUserEmail,
      'review user',
    );
    assertReservedText(
      reviewShop?.shopName,
      DEMO_FIXTURE_NAMES.reviewShop,
      'review shop',
    );
    assertReservedText(
      reviewOffer?.title,
      DEMO_FIXTURE_NAMES.reviewOffer,
      'review offer',
    );

    const deleted = await prisma.$transaction(async (tx) => {
      const counts: Record<string, number> = {};
      const remove = async (
        model: string,
        operation: Promise<{ count: number }>,
      ) => {
        counts[model] = (await operation).count;
      };

      await remove(
        'affiliateCommission',
        tx.affiliateCommissionLedger.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.affiliateCommission },
        }),
      );
      await remove(
        'affiliateConversion',
        tx.affiliateConversion.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.affiliateConversion },
        }),
      );
      await remove(
        'affiliateCode',
        tx.affiliateCode.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.affiliateCode },
        }),
      );
      await remove(
        'affiliateAccount',
        tx.affiliateAccount.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.affiliateAccount },
        }),
      );
      await remove(
        'affiliateProgram',
        tx.affiliateProgram.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.affiliateProgram },
        }),
      );

      await remove(
        'walletLedgerEntry',
        tx.walletLedgerEntry.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.walletLedgerEntry },
        }),
      );
      await remove(
        'walletTransaction',
        tx.walletTransaction.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.walletTransaction },
        }),
      );
      await remove(
        'wallet',
        tx.wallet.deleteMany({ where: { id: DEMO_FIXTURE_IDS.wallet } }),
      );

      await remove(
        'orderEscrows',
        tx.escrow.deleteMany({
          where: { id: { in: Object.values(DEMO_FIXTURE_IDS.escrows) } },
        }),
      );
      await remove(
        'paymentIntents',
        tx.paymentIntent.deleteMany({
          where: { id: { in: Object.values(DEMO_FIXTURE_IDS.paymentIntents) } },
        }),
      );
      await remove(
        'orderItems',
        tx.orderItem.deleteMany({
          where: { id: { in: Object.values(DEMO_FIXTURE_IDS.orderItems) } },
        }),
      );
      await remove(
        'orderGroups',
        tx.orderShopGroup.deleteMany({
          where: { id: { in: Object.values(DEMO_FIXTURE_IDS.orderGroups) } },
        }),
      );
      await remove(
        'orders',
        tx.order.deleteMany({
          where: { id: { in: Object.values(DEMO_FIXTURE_IDS.orders) } },
        }),
      );

      await remove(
        'chatMessages',
        tx.chatMessage.deleteMany({
          where: {
            id: {
              in: [
                DEMO_FIXTURE_IDS.chatMessageBuyer,
                DEMO_FIXTURE_IDS.chatMessageSeller,
              ],
            },
          },
        }),
      );
      await remove(
        'chatThread',
        tx.chatThread.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.chatThread },
        }),
      );

      await remove(
        'socialReactions',
        tx.socialReaction.deleteMany({
          where: { postId: DEMO_FIXTURE_IDS.communityPost },
        }),
      );
      await remove(
        'socialComment',
        tx.socialComment.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.communityComment },
        }),
      );
      await remove(
        'socialPostMedia',
        tx.socialPostMedia.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.communityMedia },
        }),
      );
      await remove(
        'socialPost',
        tx.socialPost.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.communityPost },
        }),
      );

      await remove(
        'cartItem',
        tx.cartItem.deleteMany({ where: { id: DEMO_FIXTURE_IDS.cartItem } }),
      );
      await remove(
        'voucher',
        tx.voucher.deleteMany({ where: { id: DEMO_FIXTURE_IDS.voucher } }),
      );
      await remove(
        'userAddress',
        tx.userAddress.deleteMany({ where: { id: DEMO_FIXTURE_IDS.address } }),
      );

      await remove(
        'provenanceEvent',
        tx.provenanceEvent.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.provenanceEvent },
        }),
      );
      await remove(
        'verificationLabel',
        tx.verificationLabel.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.verificationLabel },
        }),
      );
      await remove(
        'offerBatchLink',
        tx.offerBatchLink.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.batchOfferLink },
        }),
      );
      await remove(
        'supplyBatch',
        tx.supplyBatch.deleteMany({ where: { id: DEMO_FIXTURE_IDS.batch } }),
      );

      await remove(
        'offerVariantValues',
        tx.offerVariantValue.deleteMany({
          where: {
            id: {
              in: [
                DEMO_FIXTURE_IDS.variantValuePrimary,
                DEMO_FIXTURE_IDS.variantValueSecondary,
              ],
            },
          },
        }),
      );
      await remove(
        'offerVariants',
        tx.offerVariant.deleteMany({
          where: {
            id: {
              in: [
                DEMO_FIXTURE_IDS.variant,
                DEMO_FIXTURE_IDS.reviewOfferVariant,
              ],
            },
          },
        }),
      );
      await remove(
        'offerOptionValues',
        tx.offerOptionValue.deleteMany({
          where: {
            id: {
              in: [
                DEMO_FIXTURE_IDS.optionValuePrimary,
                DEMO_FIXTURE_IDS.optionValueSecondary,
              ],
            },
          },
        }),
      );
      await remove(
        'offerOptionGroups',
        tx.offerOptionGroup.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.optionGroup },
        }),
      );
      await remove(
        'offerMedia',
        tx.offerMedia.deleteMany({
          where: {
            id: {
              in: [
                DEMO_FIXTURE_IDS.offerMedia,
                DEMO_FIXTURE_IDS.offerMediaSecondary,
                DEMO_FIXTURE_IDS.reviewOfferMedia,
              ],
            },
          },
        }),
      );
      await remove(
        'moderationCase',
        tx.moderationCase.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.reviewModerationCase },
        }),
      );
      await remove(
        'offers',
        tx.offer.deleteMany({
          where: {
            id: { in: [DEMO_FIXTURE_IDS.offer, DEMO_FIXTURE_IDS.reviewOffer] },
          },
        }),
      );

      await remove(
        'shopDocumentFiles',
        tx.shopDocumentFile.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.reviewShopDocumentMedia },
        }),
      );
      await remove(
        'shopDocuments',
        tx.shopDocument.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.reviewShopDocument },
        }),
      );
      await remove(
        'shopBusinessCategory',
        tx.shopBusinessCategory.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.shopCategory },
        }),
      );
      await remove(
        'shops',
        tx.shop.deleteMany({
          where: {
            id: { in: [DEMO_FIXTURE_IDS.shop, DEMO_FIXTURE_IDS.reviewShop] },
          },
        }),
      );

      await remove(
        'userKycSubmissionDocuments',
        tx.userKycSubmissionDocument.deleteMany({
          where: {
            id: {
              in: [
                DEMO_FIXTURE_IDS.reviewKycFrontDocument,
                DEMO_FIXTURE_IDS.reviewKycBackDocument,
              ],
            },
          },
        }),
      );
      await remove(
        'userKycDocuments',
        tx.userKycDocument.deleteMany({
          where: {
            id: {
              in: [
                DEMO_FIXTURE_IDS.reviewKycFrontDocument,
                DEMO_FIXTURE_IDS.reviewKycBackDocument,
              ],
            },
          },
        }),
      );
      await remove(
        'userKycSubmissions',
        tx.userKycSubmission.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.reviewUserKycSubmission },
        }),
      );
      await remove(
        'userKyc',
        tx.userKyc.deleteMany({
          where: { id: DEMO_FIXTURE_IDS.reviewUserKyc },
        }),
      );

      await remove(
        'mediaAssets',
        tx.mediaAsset.deleteMany({
          where: {
            id: {
              in: [
                DEMO_FIXTURE_IDS.shopAvatarMedia,
                DEMO_FIXTURE_IDS.shopBannerMedia,
                DEMO_FIXTURE_IDS.offerMedia,
                DEMO_FIXTURE_IDS.offerMediaSecondary,
                DEMO_FIXTURE_IDS.reviewKycFrontMedia,
                DEMO_FIXTURE_IDS.reviewKycBackMedia,
                DEMO_FIXTURE_IDS.reviewShopDocumentMedia,
                DEMO_FIXTURE_IDS.reviewOfferMedia,
                DEMO_FIXTURE_IDS.communityMedia,
              ],
            },
          },
        }),
      );

      await remove(
        'reviewUser',
        tx.user.deleteMany({ where: { id: DEMO_FIXTURE_IDS.reviewUser } }),
      );

      return counts;
    });

    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          environment: 'UAT_DEMO',
          databaseTarget: {
            target: databaseTarget.target,
            databaseName: databaseTarget.databaseName,
            hostname: databaseTarget.hostname,
          },
          deleted,
          preserved: [
            'approved account aliases',
            'reference data',
            'buyer ACTIVE cart',
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'UAT demo fixture cleanup failed',
  );
  process.exitCode = 1;
});
