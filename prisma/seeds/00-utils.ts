import { createCipheriv, createHash, createHmac, pbkdf2Sync, randomBytes, randomUUID } from 'crypto';
import {
  AffiliateAccount,
  AffiliateCode,
  AffiliateConversion,
  AffiliateProgram,
  Brand,
  Category,
  DistributionNetwork,
  DistributionNode,
  Offer,
  Order,
  OrderItem,
  OrderShopGroup,
  Prisma,
  PrismaClient,
  ShippingCarrier,
  Shop,
  ShopType,
  SupplyBatch,
  User,
  VerificationRequirement,
} from '@prisma/client';

export type SeedContext = {
  users: User[];
  admins: User[];
  buyers: User[];
  shopOwners: User[];
  affiliateUsers: User[];
  categories: Category[];
  brands: Brand[];
  shopTypes: Record<string, ShopType>;
  requirements: Record<string, VerificationRequirement>;
  carriers: ShippingCarrier[];
  shops: Shop[];
  manufacturerShops: Shop[];
  distributorShops: Shop[];
  offers: Offer[];
  batches: SupplyBatch[];
  labels: { id: string; brandId: string; scopeId: string }[];
  networks: DistributionNetwork[];
  nodes: DistributionNode[];
  orders: Order[];
  orderItems: OrderItem[];
  orderGroups: OrderShopGroup[];
  affiliatePrograms: AffiliateProgram[];
  affiliateAccounts: AffiliateAccount[];
  affiliateCodes: AffiliateCode[];
  affiliateConversions: AffiliateConversion[];
};

export function createSeedContext(): SeedContext {
  return {
    users: [],
    admins: [],
    buyers: [],
    shopOwners: [],
    affiliateUsers: [],
    categories: [],
    brands: [],
    shopTypes: {},
    requirements: {},
    carriers: [],
    shops: [],
    manufacturerShops: [],
    distributorShops: [],
    offers: [],
    batches: [],
    labels: [],
    networks: [],
    nodes: [],
    orders: [],
    orderItems: [],
    orderGroups: [],
    affiliatePrograms: [],
    affiliateAccounts: [],
    affiliateCodes: [],
    affiliateConversions: [],
  };
}

export const COUNTS = {
  // Compact UAT profile: enough records to exercise flows without filling the DB.
  users: 8,
  userAddresses: 8,
  userKyc: 4,
  userKycDocuments: 8,
  userKycSubmissions: 6,
  userKycSubmissionDocuments: 8,
  authSessions: 4,
  passwordResetTokens: 1,
  shops: 6,
  shopBusinessCategories: 8,
  shopDocuments: 8,
  shopDocumentFiles: 10,
  brandAuthorizations: 8,
  categories: 6,
  brands: 6,
  offers: 18,
  offerMedia: 24,
  offerDocuments: 6,
  supplyBatches: 8,
  batchDocuments: 8,
  offerBatchLinks: 12,
  verificationLabels: 24,
  provenanceEvents: 48,
  riskScores: 12,
  favoriteOffers: 8,
  orders: 24,
  orderItems: 0,
  orderItemBatchAllocations: 0,
  reviews: 12,
  reviewMedia: 4,
  disputes: 4,
  disputeEvidence: 8,
  chatThreads: 6,
  chatMessages: 24,
  notifications: 40,
  notificationFcmTokens: 8,
  notificationDeliveryAttempts: 40,
  socialPosts: 8,
  socialComments: 20,
  socialCommentLikes: 24,
  socialReplies: 8,
  socialReplyLikes: 8,
  socialReactions: 16,
  socialShares: 8,
  liveSessions: 3,
  liveSessionOffers: 6,
  liveSessionReminders: 6,
  liveSessionComments: 12,
  reports: 6,
  moderationCases: 4,
  auditLogs: 20,
  distributionNetworks: 1,
  distributionNodes: 0,
  distributionShipments: 4,
  distributionShipmentItems: 8,
  distributionPricingPolicies: 6,
  affiliatePrograms: 1,
  affiliateAccounts: 4,
  affiliateCodes: 4,
  affiliateConversions: 12,
  affiliateCommissionLedger: 16,
  affiliatePayouts: 2,
  userWallets: 8,
  shopWallets: 6,
  payoutAccounts: 6,
  walletTopUps: 8,
  walletTransactions: 16,
  walletWithdrawals: 4,
  withdrawalAuthorizations: 2,
  vouchers: 6,
  voucherRedemptions: 8,
  orderVoucherAllocations: 8,
  codSettlements: 8,
};

export function id() {
  return randomUUID();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

export function encryptSeedAccountNumber(value: string) {
  const key = seedEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value.replace(/\s+/g, '').trim(), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':');
}

export function hashSeedAccountNumber(bankBin: string, value: string) {
  return createHmac('sha256', seedEncryptionKey())
    .update(`${bankBin.trim()}:${value.replace(/\s+/g, '').trim()}`)
    .digest('hex');
}

function seedEncryptionKey() {
  const configured = process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY?.trim();
  if (!configured) throw new Error('PAYOUT_ACCOUNT_ENCRYPTION_KEY is required to seed payout accounts');
  const key = /^[0-9a-f]{64}$/i.test(configured)
    ? Buffer.from(configured, 'hex')
    : Buffer.from(configured, 'base64');
  if (key.length !== 32) throw new Error('PAYOUT_ACCOUNT_ENCRYPTION_KEY must be 32 bytes');
  return key;
}

export function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

export function pick<T>(items: T[], index: number): T {
  if (!items.length) throw new Error('Cannot pick from an empty array');
  return items[index % items.length];
}

export function recentDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

export function futureDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

export function imageUrl(seed: string, width = 900, height = 900) {
  // Stable public placeholder image URL. The previous Unsplash URL was synthetic
  // and usually returned 404, so seeded media looked empty in the UI.
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

export function avatarUrl(seed: string) {
  return imageUrl(`avatar-${seed}`, 320, 320);
}

export function documentUrl(seed: string) {
  return `https://cdn.antifake.local/seed/documents/${sha256(seed).slice(0, 16)}.pdf`;
}

export function phone(index: number) {
  return `09${String(10000000 + index).slice(0, 8)}`;
}

export function taxCode(index: number) {
  return String(3000000000 + index).slice(0, 10);
}

export function gtin(index: number) {
  return String(8930000000000 + index);
}

export async function createMediaAsset(
  prisma: PrismaClient,
  input: {
    ownerUserId: string;
    resourceType: any;
    secureUrl: string;
    publicId: string;
    mimeType?: string;
    folder?: string;
    assetType?: any;
  },
) {
  return prisma.mediaAsset.create({
    data: {
      id: id(),
      ownerUserId: input.ownerUserId,
      provider: 'CLOUDINARY',
      assetType: input.assetType ?? 'IMAGE',
      resourceType: input.resourceType,
      publicId: input.publicId,
      secureUrl: input.secureUrl,
      mimeType: input.mimeType ?? 'image/jpeg',
      folder: input.folder ?? 'seed',
    },
  });
}

export async function clearSeedData(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.liveSessionVoucher.deleteMany(),
    prisma.orderRefundShopGroup.deleteMany(),
    prisma.orderRefund.deleteMany(),
    prisma.orderVoucherAllocation.deleteMany(),
    prisma.voucherRedemption.deleteMany(),
    prisma.codShopSettlement.deleteMany(),
    prisma.withdrawalAuthorization.deleteMany(),
    prisma.walletLedgerEntry.deleteMany(),
    prisma.walletWithdrawal.deleteMany(),
    prisma.walletTopUp.deleteMany(),
    prisma.walletTransaction.deleteMany(),
    prisma.payoutAccount.deleteMany(),
    prisma.bankAccountVerification.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.affiliateCommissionLedger.deleteMany(),
    prisma.affiliatePayout.deleteMany(),
    prisma.affiliateConversion.deleteMany(),
    prisma.affiliateCode.deleteMany(),
    prisma.affiliateAccount.deleteMany(),
    prisma.affiliateProgram.deleteMany(),
    prisma.liveSessionComment.deleteMany(),
    prisma.liveSessionReminder.deleteMany(),
    prisma.liveSessionOffer.deleteMany(),
    prisma.liveCommerceSession.deleteMany(),
    prisma.socialShare.deleteMany(),
    prisma.socialReaction.deleteMany(),
    prisma.socialCommentLike.deleteMany(),
    prisma.socialComment.deleteMany(),
    prisma.socialPostMedia.deleteMany(),
    prisma.socialPost.deleteMany(),
    prisma.notificationDeliveryAttempt.deleteMany(),
    prisma.notificationFcmToken.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.chatMessageAttachment.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.chatThread.deleteMany(),
    prisma.reviewMedia.deleteMany(),
    prisma.review.deleteMany(),
    prisma.disputeEvidence.deleteMany(),
    prisma.dispute.deleteMany(),
    prisma.paymentIntent.deleteMany(),
    prisma.escrow.deleteMany(),
    prisma.orderItemBatchAllocation.deleteMany(),
    prisma.orderItemOptionValue.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.orderShopGroup.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.userFavoriteOffer.deleteMany(),
    prisma.voucher.deleteMany(),
    prisma.distributionShipmentItem.deleteMany(),
    prisma.distributionShipment.deleteMany(),
    prisma.distributionPricingPolicy.deleteMany(),
    prisma.provenanceEvent.deleteMany(),
    prisma.verificationLabel.deleteMany(),
    prisma.offerBatchLink.deleteMany(),
    prisma.batchDocument.deleteMany(),
    prisma.supplyBatch.deleteMany(),
    prisma.offerDocument.deleteMany(),
    prisma.offerMedia.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.distributionNode.deleteMany(),
    prisma.distributionNetwork.deleteMany(),
    prisma.brandAuthorization.deleteMany(),
    prisma.shopDocumentFile.deleteMany(),
    prisma.shopDocument.deleteMany(),
    prisma.shopBusinessCategory.deleteMany(),
    prisma.shop.deleteMany(),
    prisma.userKycSubmissionDocument.deleteMany(),
    prisma.userKycSubmission.deleteMany(),
    prisma.userKycDocument.deleteMany(),
    prisma.userKyc.deleteMany(),
    prisma.authSession.deleteMany(),
    prisma.authLinkIntent.deleteMany(),
    prisma.authIdentity.deleteMany(),
    prisma.registrationChallenge.deleteMany(),
    prisma.registrationSession.deleteMany(),
    prisma.pendingRegistration.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.userAddress.deleteMany(),
    prisma.riskScore.deleteMany(),
    prisma.report.deleteMany(),
    prisma.moderationCase.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.shippingCarrier.deleteMany(),
    prisma.shopTypeRequirement.deleteMany(),
    prisma.verificationRequirement.deleteMany(),
    prisma.shopType.deleteMany(),
    prisma.category.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.user.deleteMany(),
  ], { maxWait: 30_000, timeout: 120_000 });
}
