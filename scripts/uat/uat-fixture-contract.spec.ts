import {
  validateUatFixtureSnapshot,
  type UatFixtureSnapshot,
} from './uat-fixture-contract';

const completeSnapshot: UatFixtureSnapshot = {
  aliases: { buyer: true, seller: true, affiliate: true, admin: true },
  counts: {
    users: 8,
    shops: 6,
    verifiedShops: 5,
    offers: 17,
    activeOffers: 16,
    variants: 68,
    activeCarts: 7,
    orders: 24,
    activeVouchers: 6,
    chatThreads: 6,
    chatMessages: 60,
    publicPosts: 7,
    affiliatePrograms: 1,
    affiliateAccounts: 4,
    affiliateConversions: 12,
    affiliateLedgerEntries: 16,
    wallets: 15,
    pendingKycs: 1,
    pendingShopVerification: 1,
    pendingOffers: 1,
  },
  positiveQr: true,
  orderStatuses: {
    completed: 5,
    paid: 5,
    shipping: 5,
    pending: 5,
    cancelled: 4,
  },
};

describe('UAT fixture contract', () => {
  it('accepts the complete reusable fixture graph', () => {
    expect(validateUatFixtureSnapshot(completeSnapshot)).toEqual({
      ok: true,
      missing: [],
    });
  });

  it.each([
    ['buyer alias', { aliases: { ...completeSnapshot.aliases, buyer: false } }],
    ['positive QR', { positiveQr: false }],
    ['active cart', { counts: { ...completeSnapshot.counts, activeCarts: 0 } }],
    [
      'order lifecycle',
      { orderStatuses: { ...completeSnapshot.orderStatuses, shipping: 0 } },
    ],
    [
      'chat history',
      { counts: { ...completeSnapshot.counts, chatMessages: 0 } },
    ],
    [
      'public community post',
      { counts: { ...completeSnapshot.counts, publicPosts: 0 } },
    ],
    [
      'Admin review queues',
      { counts: { ...completeSnapshot.counts, pendingOffers: 0 } },
    ],
  ])('reports a missing %s capability', (_name, overrides) => {
    const snapshot = { ...completeSnapshot, ...overrides };
    const result = validateUatFixtureSnapshot(snapshot);
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
