export const DEMO_ACCOUNT_ALIASES = {
  buyer: 'seed.user01@antifake.local',
  seller: 'seed.user02@antifake.local',
  admin: 'admin@antifake.io.vn',
} as const;

export const DEMO_PUBLIC_RUNTIME = {
  frontend: 'https://antifake.io.vn',
  api: 'https://api.antifake.io.vn',
} as const;

function fixtureId(sequence: number) {
  return `d0000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

export const DEMO_FIXTURE_IDS = {
  reviewUser: fixtureId(1),
  reviewUserKyc: fixtureId(2),
  reviewUserKycSubmission: fixtureId(3),
  reviewKycFrontMedia: fixtureId(4),
  reviewKycBackMedia: fixtureId(5),
  reviewKycFrontDocument: fixtureId(6),
  reviewKycBackDocument: fixtureId(7),
  shop: fixtureId(10),
  shopAvatarMedia: fixtureId(11),
  shopBannerMedia: fixtureId(12),
  shopCategory: fixtureId(13),
  offer: fixtureId(20),
  offerMedia: fixtureId(21),
  offerMediaSecondary: fixtureId(22),
  optionGroup: fixtureId(23),
  optionValuePrimary: fixtureId(24),
  optionValueSecondary: fixtureId(25),
  variant: fixtureId(26),
  variantValuePrimary: fixtureId(27),
  variantValueSecondary: fixtureId(28),
  batch: fixtureId(30),
  batchOfferLink: fixtureId(31),
  verificationLabel: fixtureId(32),
  provenanceEvent: fixtureId(33),
  address: fixtureId(40),
  cartItem: fixtureId(41),
  voucher: fixtureId(42),
  chatThread: fixtureId(50),
  chatMessageBuyer: fixtureId(51),
  chatMessageSeller: fixtureId(52),
  communityPost: fixtureId(60),
  communityMedia: fixtureId(61),
  communityComment: fixtureId(62),
  affiliateProgram: fixtureId(70),
  affiliateAccount: fixtureId(71),
  affiliateCode: fixtureId(72),
  affiliateConversion: fixtureId(73),
  affiliateCommission: fixtureId(74),
  wallet: fixtureId(80),
  walletTransaction: fixtureId(81),
  walletLedgerEntry: fixtureId(82),
  reviewShop: fixtureId(90),
  reviewShopDocument: fixtureId(91),
  reviewShopDocumentMedia: fixtureId(92),
  reviewOffer: fixtureId(93),
  reviewOfferMedia: fixtureId(94),
  reviewOfferVariant: fixtureId(95),
  reviewModerationCase: fixtureId(96),
  orders: {
    pending: fixtureId(100),
    confirmed: fixtureId(101),
    shipping: fixtureId(102),
    completed: fixtureId(103),
  },
  orderGroups: {
    pending: fixtureId(110),
    confirmed: fixtureId(111),
    shipping: fixtureId(112),
    completed: fixtureId(113),
  },
  orderItems: {
    pending: fixtureId(120),
    confirmed: fixtureId(121),
    shipping: fixtureId(122),
    completed: fixtureId(123),
  },
  paymentIntents: {
    pending: fixtureId(130),
    confirmed: fixtureId(131),
    shipping: fixtureId(132),
    completed: fixtureId(133),
  },
  escrows: {
    pending: fixtureId(140),
    confirmed: fixtureId(141),
    shipping: fixtureId(142),
    completed: fixtureId(143),
  },
} as const;

export const DEMO_FIXTURE_NAMES = {
  shop: 'DOCS_UAT_Cua_hang',
  offer: 'DOCS_UAT_San_pham',
  variantSku: 'DOCS_UAT_VARIANT_01',
  voucherCode: 'DOCS-UAT-10OFF',
  batchNumber: 'DOCS-UAT-BATCH-01',
  chatKey: 'DOCS_UAT_CHAT_BUYER_SELLER',
  communityBody:
    'DOCS_UAT: Bai dang demo phuc vu huong dan kiem tra nguon goc.',
  affiliateSlug: 'docs-uat-affiliate',
  affiliateCode: 'DOCS-UAT-AFF-01',
  reviewUserEmail: 'docs.uat.review@antifake.local',
  reviewShop: 'DOCS_UAT_Shop_Cho_duyet',
  reviewOffer: 'DOCS_UAT_San_pham_Cho_duyet',
} as const;

export function assertSyntheticFixtureValue(value: string, field: string) {
  if (!/^(UAT_|DOCS_|DEMO-?)/i.test(value)) {
    throw new Error(`${field} must use the UAT/DOCS/DEMO namespace`);
  }
  return value;
}

export type DemoFixtureSnapshot = {
  aliases: {
    buyer: boolean;
    seller: boolean;
    admin: boolean;
  };
  entities: Record<string, boolean>;
  positiveQr: boolean;
  orderStatuses: Record<string, number>;
};

export function validateDemoFixtureSnapshot(snapshot: DemoFixtureSnapshot) {
  const missing: string[] = [];

  for (const [alias, available] of Object.entries(snapshot.aliases)) {
    if (!available) missing.push(`approved account: ${alias}`);
  }

  for (const [entity, available] of Object.entries(snapshot.entities)) {
    if (!available) missing.push(entity);
  }

  if (!snapshot.positiveQr) missing.push('positive QR/provenance verification');

  for (const status of ['pending', 'confirmed', 'shipping', 'completed']) {
    if ((snapshot.orderStatuses[status] ?? 0) < 1) {
      missing.push(`order lifecycle: ${status}`);
    }
  }

  return { ok: missing.length === 0, missing };
}
