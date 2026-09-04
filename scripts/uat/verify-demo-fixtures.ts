import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import {
  DEMO_ACCOUNT_ALIASES,
  DEMO_FIXTURE_IDS,
  DEMO_FIXTURE_NAMES,
  validateDemoFixtureSnapshot,
  type DemoFixtureSnapshot,
} from './demo-fixture-contract';
import {
  assertUatDemoRuntimeDatabaseTarget,
  assertUatDemoPublicUrl,
  requiredUatSecret,
} from './uat-safety';
import { loadUatEnv } from './load-uat-env';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function buildDemoFixtureSnapshot(
  prisma: PrismaClient,
  qrCode: string,
): Promise<DemoFixtureSnapshot> {
  const [buyer, seller, admin] = await Promise.all([
    prisma.user.findUnique({
      where: { email: DEMO_ACCOUNT_ALIASES.buyer },
      select: { id: true, role: true, accountStatus: true },
    }),
    prisma.user.findUnique({
      where: { email: DEMO_ACCOUNT_ALIASES.seller },
      select: { id: true, role: true, accountStatus: true },
    }),
    prisma.user.findUnique({
      where: { email: DEMO_ACCOUNT_ALIASES.admin },
      select: { id: true, role: true, accountStatus: true },
    }),
  ]);

  const aliases = {
    buyer: buyer?.accountStatus === 'active',
    seller: seller?.accountStatus === 'active',
    admin: admin?.accountStatus === 'active' && admin.role === 'admin',
  };
  if (!buyer || !seller || !admin) {
    return {
      aliases,
      entities: {},
      positiveQr: false,
      orderStatuses: {},
    };
  }

  const shop = await prisma.shop.findFirst({
    where: {
      shopName: DEMO_FIXTURE_NAMES.shop,
      ownerUserId: seller.id,
      shopStatus: 'verified',
    },
    select: { id: true },
  });
  const offer = shop
    ? await prisma.offer.findFirst({
        where: {
          title: DEMO_FIXTURE_NAMES.offer,
          shopId: shop.id,
          sellerUserId: seller.id,
          offerStatus: 'active',
          moderationStatus: 'approved',
        },
        select: {
          id: true,
          brandId: true,
          categoryId: true,
          modelName: true,
          gtin: true,
          verificationPolicy: true,
        },
      })
    : null;
  const variant = offer
    ? await prisma.offerVariant.findFirst({
        where: {
          offerId: offer.id,
          sku: DEMO_FIXTURE_NAMES.variantSku,
          isActive: true,
        },
        select: { id: true },
      })
    : null;
  const [cart, voucher, batch] = await Promise.all([
    offer
      ? prisma.cart.findFirst({
          where: {
            buyerUserId: buyer.id,
            cartStatus: 'ACTIVE',
            items: {
              some: {
                offerId: offer.id,
                ...(variant ? { variantId: variant.id } : {}),
              },
            },
          },
          select: { id: true },
        })
      : null,
    shop
      ? prisma.voucher.findFirst({
          where: {
            shopId: shop.id,
            code: DEMO_FIXTURE_NAMES.voucherCode,
            status: 'ACTIVE',
          },
          select: { id: true },
        })
      : null,
    offer
      ? prisma.supplyBatch.findFirst({
          where: {
            shopId: shop!.id,
            batchNumber: DEMO_FIXTURE_NAMES.batchNumber,
          },
          select: { id: true },
        })
      : null,
  ]);

  const positiveQr = batch
    ? Boolean(
        await prisma.verificationLabel.findFirst({
          where: {
            codeHash: sha256(qrCode),
            labelStatus: 'active',
            scopeType: 'SUPPLY_BATCH',
            scopeId: batch.id,
            provenance: { some: { eventType: 'VERIFIED' } },
          },
          select: { id: true },
        }),
      )
    : false;

  const orderStatuses: Record<string, number> = Object.fromEntries(
    await Promise.all(
      (['pending', 'confirmed', 'shipping', 'completed'] as const).map(
        async (key) => {
          const orderStatus = key === 'confirmed' ? 'paid' : key;
          return [
            key,
            await prisma.order.count({
              where: {
                buyerUserId: buyer.id,
                shopId: shop?.id,
                orderStatus,
                shippingAddress: `DOCS_UAT Dia chi don hang ${key}`,
              },
            }),
          ] as const;
        },
      ),
    ),
  );

  const [
    chat,
    community,
    communitySecondary,
    affiliate,
    wallet,
    reviewUser,
    reviewShop,
    reviewOffer,
  ] = await Promise.all([
    prisma.chatThread.findUnique({
      where: { directParticipantKey: DEMO_FIXTURE_NAMES.chatKey },
      select: { id: true, messages: { select: { id: true } } },
    }),
    prisma.socialPost.findFirst({
      where: {
        body: DEMO_FIXTURE_NAMES.communityBody,
        visibility: 'PUBLIC',
        authorUserId: DEMO_FIXTURE_IDS.reviewUser,
      },
      select: { id: true },
    }),
    prisma.socialPost.findUnique({
      where: { id: DEMO_FIXTURE_IDS.communityPostSecondary },
      select: { id: true, visibility: true },
    }),
    prisma.affiliateProgram.findUnique({
      where: { slug: DEMO_FIXTURE_NAMES.affiliateSlug },
      select: {
        id: true,
        accounts: { where: { userId: buyer.id }, select: { id: true } },
        codes: {
          where: { code: DEMO_FIXTURE_NAMES.affiliateCode },
          select: { id: true },
        },
      },
    }),
    prisma.wallet.findUnique({
      where: { walletCode: 'DOCS-UAT-WALLET-SHOP' },
      select: {
        id: true,
        availableBalance: true,
        _count: { select: { ledgerEntries: true } },
      },
    }),
    prisma.user.findUnique({
      where: { email: DEMO_FIXTURE_NAMES.reviewUserEmail },
      select: { id: true },
    }),
    prisma.shop.findFirst({
      where: {
        shopName: DEMO_FIXTURE_NAMES.reviewShop,
        shopStatus: 'pending_verification',
      },
      select: { id: true },
    }),
    prisma.offer.findFirst({
      where: {
        title: DEMO_FIXTURE_NAMES.reviewOffer,
        moderationStatus: 'pending',
      },
      select: { id: true },
    }),
  ]);

  const completedOrder = shop
    ? await prisma.order.findFirst({
        where: {
          buyerUserId: buyer.id,
          shopId: shop.id,
          orderStatus: 'completed',
          shippingAddress: 'DOCS_UAT Dia chi don hang completed',
        },
        select: { id: true },
      })
    : null;
  const affiliateConversion = completedOrder
    ? await prisma.affiliateConversion.findUnique({
        where: { orderId: completedOrder.id },
        select: { id: true },
      })
    : null;
  const affiliateLedger = affiliateConversion
    ? await prisma.affiliateCommissionLedger.findFirst({
        where: { conversionId: affiliateConversion.id },
        select: { id: true },
      })
    : null;
  const [pendingKyc, pendingShopDocument, pendingOfferCase] = await Promise.all(
    [
      reviewUser
        ? prisma.userKyc.findFirst({
            where: { userId: reviewUser.id, verificationStatus: 'pending' },
            select: { id: true },
          })
        : null,
      reviewShop
        ? prisma.shopDocument.findFirst({
            where: { shopId: reviewShop.id, reviewStatus: 'pending' },
            select: { id: true },
          })
        : null,
      reviewOffer
        ? prisma.moderationCase.findFirst({
            where: {
              targetType: 'OFFER',
              targetId: reviewOffer.id,
              caseStatus: 'OPEN',
            },
            select: { id: true },
          })
        : null,
    ],
  );

  return {
    aliases,
    entities: {
      'approved synthetic shop': Boolean(shop),
      'active synthetic offer': Boolean(offer),
      'active variant/inventory': Boolean(variant),
      'buyer address/cart': Boolean(cart),
      'eligible active voucher': Boolean(voucher),
      'linked QR batch': Boolean(batch),
      'chat history': Boolean(chat && chat.messages.length >= 2),
      'public community post': Boolean(
        community &&
        communitySecondary &&
        communitySecondary.visibility === 'PUBLIC',
      ),
      'affiliate link/conversion/commission': Boolean(
        affiliate &&
        affiliate.accounts.length > 0 &&
        affiliate.codes.length > 0 &&
        affiliateConversion &&
        affiliateLedger,
      ),
      'non-payable shop wallet ledger': Boolean(
        wallet && wallet._count.ledgerEntries > 0,
      ),
      'Admin KYC review row': Boolean(pendingKyc),
      'Admin shop review row': Boolean(pendingShopDocument),
      'Admin offer review row': Boolean(pendingOfferCase),
    },
    positiveQr,
    orderStatuses,
  };
}

async function main() {
  loadUatEnv();
  const databaseTarget = assertUatDemoRuntimeDatabaseTarget();
  assertUatDemoPublicUrl(requiredUatSecret('UAT_FRONTEND_PUBLIC_URL'));
  const qrCode = requiredUatSecret('UAT_QR_CODE').trim().toUpperCase();
  const connectionString = requiredUatSecret('DATABASE_URL');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const snapshot = await buildDemoFixtureSnapshot(prisma, qrCode);
    const result = validateDemoFixtureSnapshot(snapshot);
    console.log(
      JSON.stringify(
        {
          status: result.ok ? 'PASS' : 'FAIL',
          environment: 'UAT_DEMO',
          databaseTarget: {
            target: databaseTarget.target,
            databaseName: databaseTarget.databaseName,
            hostname: 'withheld',
          },
          snapshot,
          missing: result.missing,
        },
        null,
        2,
      ),
    );
    if (!result.ok) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : 'UAT demo fixture verification failed',
    );
    process.exitCode = 1;
  });
}
