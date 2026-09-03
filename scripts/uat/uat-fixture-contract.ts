export type UatFixtureSnapshot = {
  aliases: {
    buyer: boolean;
    seller: boolean;
    affiliate: boolean;
    admin: boolean;
  };
  counts: {
    users: number;
    shops: number;
    verifiedShops: number;
    offers: number;
    activeOffers: number;
    variants: number;
    activeCarts: number;
    orders: number;
    activeVouchers: number;
    chatThreads: number;
    chatMessages: number;
    publicPosts: number;
    affiliatePrograms: number;
    affiliateAccounts: number;
    affiliateConversions: number;
    affiliateLedgerEntries: number;
    wallets: number;
    pendingKycs: number;
    pendingShopVerification: number;
    pendingOffers: number;
  };
  positiveQr: boolean;
  orderStatuses: Record<string, number>;
};

export function validateUatFixtureSnapshot(snapshot: UatFixtureSnapshot) {
  const missing: string[] = [];

  for (const [alias, available] of Object.entries(snapshot.aliases)) {
    if (!available) missing.push(`role alias: ${alias}`);
  }
  if (!snapshot.positiveQr) missing.push('positive QR/provenance verification');

  const minimums: Array<[keyof UatFixtureSnapshot['counts'], number, string]> =
    [
      ['users', 4, 'synthetic users'],
      ['shops', 2, 'synthetic shops'],
      ['verifiedShops', 1, 'approved seller shop'],
      ['offers', 1, 'synthetic offers'],
      ['activeOffers', 1, 'active approved offer'],
      ['variants', 1, 'active offer variant'],
      ['activeCarts', 1, 'buyer cart'],
      ['orders', 1, 'synthetic orders'],
      ['activeVouchers', 1, 'active voucher'],
      ['chatThreads', 1, 'chat thread'],
      ['chatMessages', 1, 'chat history'],
      ['publicPosts', 1, 'public community post'],
      ['affiliatePrograms', 1, 'affiliate program'],
      ['affiliateAccounts', 1, 'affiliate account'],
      ['affiliateConversions', 1, 'synthetic conversion'],
      ['affiliateLedgerEntries', 1, 'affiliate ledger history'],
      ['wallets', 1, 'synthetic wallet'],
      ['pendingKycs', 1, 'pending Admin KYC row'],
      ['pendingShopVerification', 1, 'pending Admin shop row'],
      ['pendingOffers', 1, 'pending Admin offer row'],
    ];
  for (const [key, minimum, label] of minimums) {
    if (snapshot.counts[key] < minimum) missing.push(label);
  }

  for (const status of [
    'completed',
    'paid',
    'shipping',
    'pending',
    'cancelled',
  ]) {
    if ((snapshot.orderStatuses[status] ?? 0) < 1)
      missing.push(`order lifecycle: ${status}`);
  }

  return { ok: missing.length === 0, missing };
}
