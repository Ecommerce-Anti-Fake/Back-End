import { pbkdf2Sync, randomBytes, randomUUID, createHash } from 'crypto';
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
    affiliatePrograms: [],
    affiliateAccounts: [],
    affiliateCodes: [],
    affiliateConversions: [],
  };
}

export const COUNTS = {
  users: 3,
  userAddresses: 3,
  userKyc: 3,
  userKycDocuments: 6,
  userKycSubmissions: 3,
  userKycSubmissionDocuments: 6,
  authSessions: 3,
  passwordResetTokens: 1,
  shops: 2,
  shopBusinessCategories: 4,
  shopDocuments: 4,
  shopDocumentFiles: 6,
  brandAuthorizations: 4,
  categories: 5,
  brands: 5,
  offers: 5,
  offerMedia: 10,
  offerDocuments: 5,
  supplyBatches: 5,
  batchDocuments: 5,
  offerBatchLinks: 5,
  verificationLabels: 10,
  provenanceEvents: 10,
  riskScores: 7,
  favoriteOffers: 0,
  orders: 0,
  orderItems: 0,
  orderItemBatchAllocations: 0,
  reviews: 0,
  reviewMedia: 0,
  disputes: 0,
  disputeEvidence: 0,
  chatThreads: 0,
  chatMessages: 0,
  notifications: 0,
  notificationFcmTokens: 0,
  notificationDeliveryAttempts: 0,
  socialPosts: 0,
  socialComments: 0,
  socialCommentLikes: 0,
  socialReplies: 0,
  socialReplyLikes: 0,
  socialReactions: 0,
  socialShares: 0,
  liveSessions: 0,
  liveSessionOffers: 0,
  liveSessionReminders: 0,
  liveSessionComments: 0,
  reports: 0,
  moderationCases: 0,
  auditLogs: 0,
  distributionNetworks: 0,
  distributionNodes: 0,
  distributionShipments: 0,
  distributionShipmentItems: 0,
  distributionPricingPolicies: 0,
  affiliatePrograms: 0,
  affiliateAccounts: 0,
  affiliateCodes: 0,
  affiliateConversions: 0,
  affiliateCommissionLedger: 0,
  affiliatePayouts: 0,
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
    prisma.socialPost.deleteMany(),
    prisma.notificationDeliveryAttempt.deleteMany(),
    prisma.notificationFcmToken.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.chatThread.deleteMany(),
    prisma.reviewMedia.deleteMany(),
    prisma.review.deleteMany(),
    prisma.disputeEvidence.deleteMany(),
    prisma.dispute.deleteMany(),
    prisma.paymentIntent.deleteMany(),
    prisma.escrow.deleteMany(),
    prisma.orderItemBatchAllocation.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.userFavoriteOffer.deleteMany(),
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
  ]);
}
