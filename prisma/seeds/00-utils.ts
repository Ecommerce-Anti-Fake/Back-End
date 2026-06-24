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
  users: 20,
  userAddresses: 35,
  userKyc: 12,
  userKycDocuments: 24,
  userKycSubmissions: 15,
  userKycSubmissionDocuments: 30,
  authSessions: 10,
  passwordResetTokens: 5,
  shops: 15,
  shopBusinessCategories: 30,
  shopDocuments: 25,
  shopDocumentFiles: 50,
  shopCategoryDocuments: 30,
  brandAuthorizations: 20,
  categories: 15,
  brands: 15,
  offers: 60,
  offerMedia: 120,
  offerDocuments: 30,
  offerShippingMethods: 120,
  supplyBatches: 40,
  batchDocuments: 40,
  offerBatchLinks: 80,
  verificationLabels: 200,
  provenanceEvents: 800,
  riskScores: 50,
  favoriteOffers: 200,
  orders: 200,
  orderItems: 300,
  orderItemBatchAllocations: 300,
  reviews: 100,
  reviewMedia: 20,
  disputes: 10,
  disputeEvidence: 30,
  chatThreads: 20,
  chatMessages: 200,
  notifications: 400,
  notificationFcmTokens: 25,
  notificationDeliveryAttempts: 600,
  socialPosts: 20,
  socialComments: 100,
  socialReactions: 300,
  socialShares: 50,
  liveSessions: 10,
  liveSessionOffers: 30,
  liveSessionReminders: 50,
  liveSessionComments: 100,
  reports: 20,
  moderationCases: 10,
  auditLogs: 100,
  distributionNetworks: 2,
  distributionNodes: 30,
  distributionShipments: 20,
  distributionShipmentItems: 40,
  distributionPricingPolicies: 20,
  affiliatePrograms: 2,
  affiliateAccounts: 10,
  affiliateCodes: 15,
  affiliateConversions: 20,
  affiliateCommissionLedger: 60,
  affiliatePayouts: 4,
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
    prisma.offerShippingMethod.deleteMany(),
    prisma.offerDocument.deleteMany(),
    prisma.offerMedia.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.distributionNode.deleteMany(),
    prisma.distributionNetwork.deleteMany(),
    prisma.brandAuthorization.deleteMany(),
    prisma.shopDocumentFile.deleteMany(),
    prisma.shopDocument.deleteMany(),
    prisma.shopCategoryDocument.deleteMany(),
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
