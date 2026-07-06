export const AUTH_SERVICE_CLIENT = 'AUTH_SERVICE_CLIENT';
export const USERS_SERVICE_CLIENT = 'USERS_SERVICE_CLIENT';
export const CATALOG_SERVICE_CLIENT = 'CATALOG_SERVICE_CLIENT';
export const ORDERS_SERVICE_CLIENT = 'ORDERS_SERVICE_CLIENT';
export const AFFILIATE_SERVICE_CLIENT = 'AFFILIATE_SERVICE_CLIENT';

export const AUTH_MESSAGE_PATTERNS = {
  register: 'auth.register',
  login: 'auth.login',
  firebaseLogin: 'auth.firebase-login',
  refresh: 'auth.refresh',
  logout: 'auth.logout',
  requestPasswordReset: 'auth.request-password-reset',
  resetPassword: 'auth.reset-password',
  changePassword: 'auth.change-password',
  adminCheck: 'auth.admin-check',
} as const;

export const USERS_MESSAGE_PATTERNS = {
  findAll: 'users.find-all',
  getCurrentProfile: 'users.get-current-profile',
  updateCurrentProfile: 'users.update-current-profile',
  uploadCurrentAvatar: 'users.upload-current-avatar',
  getProfileCompletion: 'users.get-profile-completion',
  listAddresses: 'users.list-addresses',
  getDefaultAddress: 'users.get-default-address',
  createAddress: 'users.create-address',
  updateAddress: 'users.update-address',
  setDefaultAddress: 'users.set-default-address',
  deleteAddress: 'users.delete-address',
  getMyKyc: 'users.get-my-kyc',
  findPendingKycs: 'users.find-pending-kycs',
  getAdminKycSummary: 'users.get-admin-kyc-summary',
  getAdminKycDetail: 'users.get-admin-kyc-detail',
  getKycUploadSignatures: 'users.get-kyc-upload-signatures',
  submitKyc: 'users.submit-kyc',
  reviewKyc: 'users.review-kyc',
  findById: 'users.find-by-id',
  findByIdentifier: 'users.find-by-identifier',
  create: 'users.create',
  updatePassword: 'users.update-password',
  getUserById: 'users.get-user-by-id',
  updateUser: 'users.update-user',
  deleteUser: 'users.delete-user',
  listNotifications: 'users.list-notifications',
  markNotificationRead: 'users.mark-notification-read',
  markAllNotificationsRead: 'users.mark-all-notifications-read',
  registerNotificationFcmToken: 'users.register-notification-fcm-token',
  revokeNotificationFcmToken: 'users.revoke-notification-fcm-token',
  createNotification: 'users.create-notification',
} as const;

export const SHOPS_MESSAGE_PATTERNS = {
  create: 'shops.create',
  updateProfile: 'shops.update-profile',
  updateRegistrationType: 'shops.update-registration-type',
  findPublic: 'shops.find-public',
  findByOffer: 'shops.find-by-offer',
  findById: 'shops.find-by-id',
  findCategoriesByShopId: 'shops.find-categories-by-shop-id',
  findMine: 'shops.find-mine',
  getVerificationSummary: 'shops.get-verification-summary',
  findPendingVerification: 'shops.find-pending-verification',
  getAdminVerificationSummary: 'shops.get-admin-verification-summary',
  getAdminVerificationDetail: 'shops.get-admin-verification-detail',
  getAdminRegistrationDetail: 'shops.get-admin-registration-detail',
  findShopDocuments: 'shops.find-shop-documents',
  findShopDocumentRequirements: 'shops.find-shop-document-requirements',
  getShopDocumentUploadSignatures: 'shops.get-shop-document-upload-signatures',
  submitShopDocuments: 'shops.submit-shop-documents',
  getBrandAuthorizationUploadSignatures: 'shops.get-brand-authorization-upload-signatures',
  submitBrandAuthorization: 'shops.submit-brand-authorization',
  findBrandAuthorizations: 'shops.find-brand-authorizations',
  findAdminBrandAuthorizations: 'shops.find-admin-brand-authorizations',
  reviewBrandAuthorization: 'shops.review-brand-authorization',
  reviewShopDocument: 'shops.review-shop-document',
} as const;

export const PRODUCTS_MESSAGE_PATTERNS = {
  findBrands: 'products.find-brands',
  createBrand: 'products.create-brand',
  findCategories: 'products.find-categories',
  createCategory: 'products.create-category',
  createOffer: 'products.create-offer',
  updateOffer: 'products.update-offer',
  findShippingCarriers: 'products.find-shipping-carriers',
  findOffers: 'products.find-offers',
  findAdminOffers: 'products.find-admin-offers',
  findOfferById: 'products.find-offer-by-id',
  findFavoriteOffers: 'products.find-favorite-offers',
  addFavoriteOffer: 'products.add-favorite-offer',
  removeFavoriteOffer: 'products.remove-favorite-offer',
  findChatThreads: 'products.find-chat-threads',
  getChatThread: 'products.get-chat-thread',
  startChatThread: 'products.start-chat-thread',
  sendChatMessage: 'products.send-chat-message',
  listSocialPosts: 'products.list-social-posts',
  getSocialPost: 'products.get-social-post',
  listSocialComments: 'products.list-social-comments',
  listSocialCommentReplies: 'products.list-social-comment-replies',
  createSocialPost: 'products.create-social-post',
  createSocialComment: 'products.create-social-comment',
  createSocialCommentReply: 'products.create-social-comment-reply',
  setSocialReaction: 'products.set-social-reaction',
  removeSocialReaction: 'products.remove-social-reaction',
  shareSocialPost: 'products.share-social-post',
  updateSocialPostVisibility: 'products.update-social-post-visibility',
  listLiveSessions: 'products.list-live-sessions',
  createLiveSession: 'products.create-live-session',
  updateLiveSessionStatus: 'products.update-live-session-status',
  remindLiveSession: 'products.remind-live-session',
  listLiveComments: 'products.list-live-comments',
  createLiveComment: 'products.create-live-comment',
  updateLiveCommentVisibility: 'products.update-live-comment-visibility',
  deleteLiveComment: 'products.delete-live-comment',
  allocateOfferBatches: 'products.allocate-offer-batches',
  findOfferBatchLinks: 'products.find-offer-batch-links',
  getOfferMediaUploadSignatures: 'products.get-offer-media-upload-signatures',
  addOfferMediaBatch: 'products.add-offer-media-batch',
  findOfferMedia: 'products.find-offer-media',
  deleteOfferMedia: 'products.delete-offer-media',
  setOfferPrimaryMedia: 'products.set-offer-primary-media',
  findOfferReviews: 'products.find-offer-reviews',
  createOfferReview: 'products.create-offer-review',
  createOrderItemReview: 'products.create-order-item-review',
  getReviewMediaUploadSignatures: 'products.get-review-media-upload-signatures',
  addReviewMediaBatch: 'products.add-review-media-batch',
  getOfferDocumentUploadSignatures: 'products.get-offer-document-upload-signatures',
  addOfferDocumentsBatch: 'products.add-offer-documents-batch',
  findOfferDocuments: 'products.find-offer-documents',
  deleteOfferDocument: 'products.delete-offer-document',
} as const;

export const ORDERS_MESSAGE_PATTERNS = {
  getActiveCart: 'orders.get-active-cart',
  addCartItem: 'orders.add-cart-item',
  updateCartItem: 'orders.update-cart-item',
  removeCartItem: 'orders.remove-cart-item',
  checkoutCart: 'orders.checkout-cart',
  checkoutCartItem: 'orders.checkout-cart-item',
  quoteCartItemShippingOptions: 'orders.quote-cart-item-shipping-options',
  quoteCartShippingOptions: 'orders.quote-cart-shipping-options',
  create: 'orders.create',
  findMine: 'orders.find-mine',
  findSellerShopOrders: 'orders.find-seller-shop-orders',
  getSellerShopDashboardAnalytics: 'orders.get-seller-shop-dashboard-analytics',
  getSellerShopDailyMetrics: 'orders.get-seller-shop-daily-metrics',
  getSellerShopSummaryMetrics: 'orders.get-seller-shop-summary-metrics',
  getSellerShopOrderStatusSummary: 'orders.get-seller-shop-order-status-summary',
  getShopBestSellingProducts: 'orders.get-shop-best-selling-products',
  findAdminOrders: 'orders.find-admin-orders',
  getAdminFinanceReconciliation: 'orders.get-admin-finance-reconciliation',
  findById: 'orders.find-by-id',
  getFulfillmentAudit: 'orders.get-fulfillment-audit',
  getAdminOpenDisputeCount: 'orders.get-admin-open-dispute-count',
  findAdminOpenDisputes: 'orders.find-admin-open-disputes',
  createReport: 'orders.create-report',
  findMyReports: 'orders.find-my-reports',
  findAdminReports: 'orders.find-admin-reports',
  updateAdminReport: 'orders.update-admin-report',
  calculateRiskScore: 'orders.calculate-risk-score',
  findAdminRiskScores: 'orders.find-admin-risk-scores',
  findAdminModerationCases: 'orders.find-admin-moderation-cases',
  updateAdminModerationCase: 'orders.update-admin-moderation-case',
  getAdminDisputeSummary: 'orders.get-admin-dispute-summary',
  getAdminDisputeDetail: 'orders.get-admin-dispute-detail',
  assignAdminDispute: 'orders.assign-admin-dispute',
  updateAdminDisputeCase: 'orders.update-admin-dispute-case',
  resolveAdminDispute: 'orders.resolve-admin-dispute',
  markPaid: 'orders.mark-paid',
  handlePayOSWebhook: 'orders.handle-payos-webhook',
  retryPayOSPayment: 'orders.retry-payos-payment',
  receiveWholesaleInventory: 'orders.receive-wholesale-inventory',
  bookShipping: 'orders.book-shipping',
  syncShippingStatus: 'orders.sync-shipping-status',
  listGhnProvinces: 'orders.list-ghn-provinces',
  listGhnDistricts: 'orders.list-ghn-districts',
  listGhnWards: 'orders.list-ghn-wards',
  listGhnServices: 'orders.list-ghn-services',
  complete: 'orders.complete',
  cancel: 'orders.cancel',
  openDispute: 'orders.open-dispute',
  resolveDispute: 'orders.resolve-dispute',
  getDisputeEvidenceUploadSignatures: 'orders.get-dispute-evidence-upload-signatures',
  addDisputeEvidenceBatch: 'orders.add-dispute-evidence-batch',
  findDisputeEvidence: 'orders.find-dispute-evidence',
  refund: 'orders.refund',
  updateFulfillment: 'orders.update-fulfillment',
} as const;

export const DISTRIBUTION_MESSAGE_PATTERNS = {
  createNetwork: 'distribution.create-network',
  findNetworks: 'distribution.find-networks',
  createNode: 'distribution.create-node',
  inviteNode: 'distribution.invite-node',
  acceptNodeInvitation: 'distribution.accept-node-invitation',
  declineNodeInvitation: 'distribution.decline-node-invitation',
  findMyInvitations: 'distribution.find-my-invitations',
  findMyMemberships: 'distribution.find-my-memberships',
  findNodesByNetwork: 'distribution.find-nodes-by-network',
  updateNodeStatus: 'distribution.update-node-status',
  createBatch: 'distribution.create-batch',
  findBatches: 'distribution.find-batches',
  getBatchDetail: 'distribution.get-batch-detail',
  getInventorySummary: 'distribution.get-inventory-summary',
  getAdminInventoryAudit: 'distribution.get-admin-inventory-audit',
  getOrderItemLineage: 'distribution.get-order-item-lineage',
  createShipment: 'distribution.create-shipment',
  dispatchShipment: 'distribution.dispatch-shipment',
  findShipmentsByNetwork: 'distribution.find-shipments-by-network',
  getShipment: 'distribution.get-shipment',
  receiveShipment: 'distribution.receive-shipment',
  cancelShipment: 'distribution.cancel-shipment',
  getBatchDocumentUploadSignatures: 'distribution.get-batch-document-upload-signatures',
  addBatchDocumentsBatch: 'distribution.add-batch-documents-batch',
  findBatchDocuments: 'distribution.find-batch-documents',
  createPricingPolicy: 'distribution.create-pricing-policy',
  findPricingPoliciesByNetwork: 'distribution.find-pricing-policies-by-network',
  resolveWholesalePricing: 'distribution.resolve-wholesale-pricing',
} as const;

export const AFFILIATE_MESSAGE_PATTERNS = {
  createProgram: 'affiliate.create-program',
  findMyPrograms: 'affiliate.find-my-programs',
  joinProgram: 'affiliate.join-program',
  findMyAccounts: 'affiliate.find-my-accounts',
  getAccountSummary: 'affiliate.get-account-summary',
  findConversionsByAccount: 'affiliate.find-conversions-by-account',
  findCommissionsByAccount: 'affiliate.find-commissions-by-account',
  createCode: 'affiliate.create-code',
  findCodesByAccount: 'affiliate.find-codes-by-account',
  findConversionsByProgram: 'affiliate.find-conversions-by-program',
  approveConversion: 'affiliate.approve-conversion',
  rejectConversion: 'affiliate.reject-conversion',
  createPayout: 'affiliate.create-payout',
  findPayoutsByAccount: 'affiliate.find-payouts-by-account',
  findPayoutsByProgram: 'affiliate.find-payouts-by-program',
  updatePayoutStatus: 'affiliate.update-payout-status',
} as const;

export type CurrentUserProfileMessage = {
  userId: string;
};

export type UpdateCurrentUserProfileMessage = {
  userId: string;
  phone?: string | null;
  displayName?: string | null;
};

export type UploadCurrentUserAvatarMessage = {
  userId: string;
  avatar: {
    buffer: Buffer;
    mimetype: string;
    originalname?: string;
    size: number;
  };
};

export type CurrentUserProfileCompletionMessage = {
  userId: string;
};

export type ListNotificationsMessage = {
  userId: string;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type NotificationLookupMessage = {
  userId: string;
  notificationId: string;
};

export type RegisterNotificationFcmTokenMessage = {
  userId: string;
  token: string;
  deviceId?: string | null;
  userAgent?: string | null;
};

export type RevokeNotificationFcmTokenMessage = {
  userId: string;
  token?: string | null;
  deviceId?: string | null;
};

export type CreateNotificationMessage = {
  userId: string;
  notificationType: string;
  title: string;
  body: string;
  targetType?: string | null;
  targetId?: string | null;
  dedupeKey: string;
  eventName?: string | null;
};

export type UserAddressLookupMessage = {
  userId: string;
  addressId: string;
};

export type CreateUserAddressMessage = {
  userId: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  provinceCode?: string | null;
  provinceName?: string | null;
  wardCode?: string | null;
  wardName?: string | null;
  isDefault?: boolean;
};

export type UpdateUserAddressMessage = {
  userId: string;
  addressId: string;
  recipientName?: string;
  phone?: string;
  addressLine?: string;
  provinceCode?: string | null;
  provinceName?: string | null;
  wardCode?: string | null;
  wardName?: string | null;
  isDefault?: boolean;
};

export type CurrentUserKycMessage = {
  userId: string;
};

export type PendingKycsLookupMessage = {
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'id' | 'fullName' | 'verifiedAt';
  sortOrder?: 'asc' | 'desc';
};

export type AdminKycDetailMessage = {
  userId: string;
};

export type AdminKycSummaryMessage = Record<string, never>;

export type KycUploadSignaturesMessage = {
  userId: string;
  items: Array<{
    side: 'FRONT' | 'BACK';
  }>;
};

export type SubmitKycMessage = {
  userId: string;
  idType: string;
  documents: Array<{
    side: 'FRONT' | 'BACK';
    assetType: 'IMAGE';
    mimeType: string;
    file: {
      buffer: Buffer | { data?: number[] };
      mimetype: string;
      originalname?: string;
      size: number;
    };
  }>;
};

export type ReviewKycMessage = {
  reviewerUserId: string;
  userId: string;
  verificationStatus: 'approved' | 'rejected';
  reviewNote?: string | null;
};

export type UserIdentityLookupMessage = {
  id?: string;
  email?: string | null;
  phone?: string | null;
};

export type CreateUserIdentityMessage = {
  email: string | null;
  phone: string | null;
  displayName: string | null;
  password: string;
  role?: string;
};

export type UpdateUserPasswordMessage = {
  userId: string;
  password: string;
};

export type ListUsersMessage = {
  role?: 'user';
};

export type UserLookupMessage = {
  id: string;
};

export type UpdateUserMessage = {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
};

export type CreateShopMessage = {
  ownerUserId: string;
  shopName: string;
  registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
  businessType: string;
  taxCode?: string | null;
  warehouseAddress?: string | null;
  warehouseProvinceCode?: string | null;
  warehouseProvinceName?: string | null;
  warehouseWardCode?: string | null;
  warehouseWardName?: string | null;
  categoryIds: string[];
};

export type UpdateShopProfileMessage = {
  shopId: string;
  requesterUserId: string;
  shopName?: string;
  businessType?: string;
  taxCode?: string | null;
  warehouseAddress?: string | null;
  warehouseProvinceCode?: string | null;
  warehouseProvinceName?: string | null;
  warehouseWardCode?: string | null;
  warehouseWardName?: string | null;
};

export type UpdateShopRegistrationTypeMessage = {
  shopId: string;
  requesterUserId: string;
  registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
};

export type ShopLookupMessage = {
  id: string;
};

export type ShopByOfferLookupMessage = {
  offerId: string;
};

export type ShopCategoriesLookupMessage = {
  shopId: string;
};

export type PublicShopsLookupMessage = {
  page?: number;
  pageSize?: number;
};

export type MyShopsLookupMessage = {
  ownerUserId: string;
};

export type PendingVerificationShopsLookupMessage = {
  shopStatus?: 'pending_kyc' | 'pending_verification' | 'verified';
  registrationType?: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'shopName';
  sortOrder?: 'asc' | 'desc';
};

export type AdminShopVerificationDetailMessage = {
  shopId: string;
};

export type AdminShopRegistrationDetailMessage = {
  shopId: string;
};

export type AdminShopVerificationSummaryMessage = Record<string, never>;

export type ShopVerificationSummaryMessage = {
  shopId: string;
  requesterUserId: string;
};

export type ShopDocumentsLookupMessage = {
  shopId: string;
  requesterUserId: string;
};

export type ShopDocumentRequirementsLookupMessage = {
  shopId: string;
  requesterUserId: string;
};

export type ShopDocumentUploadSignaturesMessage = {
  shopId: string;
  requesterUserId: string;
  items: Array<{
    docType: string;
  }>;
};

export type SubmitShopDocumentsMessage = {
  shopId: string;
  requesterUserId: string;
  items: Array<{
    docType: string;
    file: {
      buffer: Buffer | { data?: number[] };
      mimetype: string;
      originalname?: string;
      size: number;
    };
  }>;
};

export type ReviewShopDocumentMessage = {
  shopId: string;
  reviewerUserId: string;
  reviewStatus: 'approved' | 'rejected';
  reviewNote?: string | null;
};

export type BrandAuthorizationUploadSignaturesMessage = {
  shopId: string;
  brandId: string;
  requesterUserId: string;
};

export type SubmitBrandAuthorizationMessage = {
  shopId: string;
  brandId: string;
  requesterUserId: string;
  authorizationType: string;
  mimeType: string;
  fileUrl: string;
  publicId: string;
};

export type BrandAuthorizationsLookupMessage = {
  shopId: string;
  requesterUserId: string;
};

export type AdminBrandAuthorizationsLookupMessage = {
  verificationStatus?: 'pending' | 'approved' | 'rejected';
};

export type ReviewBrandAuthorizationMessage = {
  authorizationId: string;
  reviewerUserId: string;
  verificationStatus: 'approved' | 'rejected';
  reviewNote?: string | null;
};

export type OfferLookupMessage = {
  id: string;
};

export type FavoriteOfferMessage = {
  userId: string;
  offerId: string;
};

export type FavoriteOffersLookupMessage = {
  userId: string;
};

export type CreateBrandMessage = {
  name: string;
  registryStatus?: string;
};

export type CreateCategoryMessage = {
  requesterUserId: string;
  name: string;
  parentId?: string | null;
  image?: {
    buffer: Buffer | { data?: number[] };
    mimetype: string;
    originalname?: string;
    size: number;
  };
  riskTier?: string;
};

export type ListOffersMessage = {
  shopId?: string;
  sellerUserId?: string;
  includeInactive?: boolean;
  q?: string;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  verificationStatus?: string;
  shopType?: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
  salesChannel?: 'retail' | 'wholesale' | 'all';
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc';
  page?: number;
  pageSize?: number;
};

export type ChatRequesterMessage = {
  requesterUserId: string;
  requesterRole?: string | null;
};

export type StartChatThreadMessage = ChatRequesterMessage & {
  shopId: string;
  initialMessage?: string | null;
};

export type ChatThreadLookupMessage = ChatRequesterMessage & {
  threadId: string;
  before?: string | null;
  limit?: number | null;
};

export type SendChatMessageMessage = ChatThreadLookupMessage & {
  body: string;
  clientMessageId?: string | null;
  messageType?: 'TEXT';
};

export type ListSocialPostsMessage = {
  requesterUserId?: string | null;
  includeHidden?: boolean;
  page?: number;
  pageSize?: number;
};

export type CreateSocialPostMessage = {
  requesterUserId: string;
  postType: 'SHARE' | 'QUESTION' | 'PRODUCT_SHARE';
  body: string;
  media?: Array<{
    buffer: Buffer;
    mimetype: string;
    originalname?: string;
    size: number;
  }>;
};

export type SocialPostLookupMessage = {
  requesterUserId: string;
  requesterRole?: string | null;
  postId: string;
};

export type ListSocialCommentsMessage = {
  requesterUserId?: string | null;
  requesterRole?: string | null;
  postId: string;
  page?: number;
  pageSize?: number;
};

export type ListSocialCommentRepliesMessage = {
  requesterUserId?: string | null;
  requesterRole?: string | null;
  commentId: string;
  page?: number;
  pageSize?: number;
};

export type CreateSocialCommentMessage = SocialPostLookupMessage & {
  body: string;
};

export type CreateSocialCommentReplyMessage = {
  commentId: string;
  requesterUserId: string;
  body: string;
};

export type SetSocialReactionMessage = SocialPostLookupMessage & {
  reactionType?: 'LIKE';
};

export type UpdateSocialPostVisibilityMessage = SocialPostLookupMessage & {
  visibility: 'PUBLIC' | 'HIDDEN';
};

export type ListLiveSessionsMessage = {
  requesterUserId?: string | null;
  filter?: 'all' | 'live' | 'upcoming';
  q?: string | null;
};

export type CreateLiveSessionMessage = {
  requesterUserId: string;
  shopId: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  startAt: string;
  playbackUrl?: string | null;
  streamProvider?: string | null;
  streamProviderSessionId?: string | null;
  streamIngestUrl?: string | null;
  streamLatencyTargetMs?: number | null;
  recordingUrl?: string | null;
  recordingRetentionDays?: number | null;
  offerIds?: string[];
};

export type LiveSessionLookupMessage = {
  sessionId: string;
  requesterUserId: string;
  requesterRole?: string | null;
};

export type UpdateLiveSessionStatusMessage = LiveSessionLookupMessage & {
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
};

export type ListLiveCommentsMessage = {
  sessionId: string;
  requesterUserId?: string | null;
  requesterRole?: string | null;
  cursor?: string | null;
  since?: string | null;
  pageSize?: number | null;
  includeHidden?: boolean | null;
};

export type CreateLiveCommentMessage = LiveSessionLookupMessage & {
  body: string;
  clientMessageId?: string | null;
};

export type UpdateLiveCommentVisibilityMessage = LiveSessionLookupMessage & {
  commentId: string;
  visibility: 'PUBLIC' | 'HIDDEN';
};

export type DeleteLiveCommentMessage = LiveSessionLookupMessage & {
  commentId: string;
};

export type CreateOfferMessage = {
  sellerUserId: string;
  shopId?: string | null;
  categoryId: string;
  brandId?: string | null;
  distributionNodeId?: string | null;
  title: string;
  description: string;
  price: number;
  currency?: string;
  itemCondition?: string;
  availableQuantity: number;
  verificationLevel?: string;
  offerStatus?: 'active' | 'inactive' | 'draft';
  parcelWeightGrams?: number | null;
  parcelLengthCm?: number | null;
  parcelWidthCm?: number | null;
  parcelHeightCm?: number | null;
  productImages?: Array<{
    buffer: Buffer;
    mimetype: string;
    originalname?: string;
    size: number;
  }>;
};

export type UpdateOfferMessage = {
  offerId: string;
  sellerUserId: string;
  title?: string;
  description?: string;
  price?: number;
  availableQuantity?: number;
  offerStatus?: 'active' | 'inactive' | 'draft';
  parcelWeightGrams?: number | null;
  parcelLengthCm?: number | null;
  parcelWidthCm?: number | null;
  parcelHeightCm?: number | null;
};

export type AdminOffersLookupMessage = {
  offerStatus?: 'active' | 'inactive' | 'draft';
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'banned';
  page?: number;
  pageSize?: number;
};

export type OfferMediaUploadSignaturesMessage = {
  offerId: string;
  requesterUserId: string;
  items: Array<{
    assetType: 'IMAGE' | 'VIDEO';
  }>;
};

export type AddOfferMediaBatchMessage = {
  offerId: string;
  requesterUserId: string;
  items: Array<{
    assetType: 'IMAGE' | 'VIDEO';
    mimeType: string;
    fileUrl: string;
    publicId: string;
    mediaType?: string | null;
    phash?: string | null;
    bytes?: number | null;
  }>;
};

export type OfferMediaLookupMessage = {
  offerId: string;
};

export type DeleteOfferMediaMessage = {
  offerId: string;
  mediaId: string;
  requesterUserId: string;
};

export type SetOfferPrimaryMediaMessage = {
  offerId: string;
  mediaId: string;
  requesterUserId: string;
};

export type OfferReviewsLookupMessage = {
  offerId: string;
};

export type CreateOfferReviewMessage = {
  offerId: string;
  fromUserId: string;
  rating: number;
  comment?: string | null;
};

export type CreateOrderItemReviewMessage = {
  orderItemId: string;
  fromUserId: string;
  rating: number;
  comment?: string | null;
};

export type ReviewMediaUploadSignaturesMessage = {
  reviewId: string;
  requesterUserId: string;
  items: Array<{
    assetType: 'IMAGE';
  }>;
};

export type AddReviewMediaBatchMessage = {
  reviewId: string;
  requesterUserId: string;
  items: Array<{
    assetType: 'IMAGE';
    mimeType: string;
    fileUrl: string;
    publicId: string;
  }>;
};

export type OfferDocumentUploadSignaturesMessage = {
  offerId: string;
  requesterUserId: string;
  items: Array<{
    docType: string;
  }>;
};

export type AddOfferDocumentsBatchMessage = {
  offerId: string;
  requesterUserId: string;
  items: Array<{
    docType: string;
    mimeType: string;
    fileUrl: string;
    publicId: string;
    issuerName?: string | null;
    documentNumber?: string | null;
    bytes?: number | null;
  }>;
};

export type OfferDocumentsLookupMessage = {
  offerId: string;
};

export type DeleteOfferDocumentMessage = {
  offerId: string;
  documentId: string;
  requesterUserId: string;
};

export type AllocateOfferBatchesMessage = {
  offerId: string;
  requesterUserId: string;
  items: Array<{
    batchId: string;
    allocatedQuantity: number;
  }>;
};

export type OfferBatchLinksLookupMessage = {
  offerId: string;
};

export type CreateOrderMessage = {
  buyerUserId: string;
  buyerShopId?: string | null;
  buyerDistributionNodeId?: string | null;
  offerId: string;
  quantity: number;
  paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'PAYOS' | null;
  affiliateCode?: string | null;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  shippingDistrictId?: number | null;
  shippingDistrictName?: string | null;
  shippingWardCode?: string | null;
  shippingWardName?: string | null;
  shippingProviderCode?: string | null;
  shippingServiceId?: number | null;
  shippingServiceTypeId?: number | null;
};

export type ActiveCartMessage = {
  buyerUserId: string;
};

export type AddCartItemMessage = {
  buyerUserId: string;
  offerId: string;
  quantity: number;
};

export type UpdateCartItemMessage = {
  buyerUserId: string;
  cartItemId: string;
  quantity: number;
};

export type RemoveCartItemMessage = {
  buyerUserId: string;
  cartItemId: string;
};

export type CheckoutCartItemMessage = {
  buyerUserId: string;
  cartItemId: string;
  paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'PAYOS' | null;
  affiliateCode?: string | null;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  shippingDistrictId?: number | null;
  shippingDistrictName?: string | null;
  shippingWardCode?: string | null;
  shippingWardName?: string | null;
  shippingProviderCode?: string | null;
  shippingServiceId?: number | null;
  shippingServiceTypeId?: number | null;
};

export type CheckoutCartMessage = {
  buyerUserId: string;
  cartItemIds: string[];
  paymentMethod: 'COD' | 'PAYOS';
  shippingOptionCode: string;
  affiliateCode?: string | null;
};

export type QuoteCartItemShippingOptionsMessage = {
  buyerUserId: string;
  cartItemId: string;
  shippingAddress?: string | null;
  shippingDistrictId?: number | null;
  shippingWardCode?: string | null;
};

export type QuoteCartShippingOptionsMessage = {
  buyerUserId: string;
  cartItemIds: string[];
};

export type MyOrdersLookupMessage = {
  requesterUserId: string;
};

export type SellerShopOrdersLookupMessage = {
  requesterUserId: string;
  shopId: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type SellerShopDashboardAnalyticsMessage = {
  requesterUserId: string;
  shopId: string;
  days?: number;
  fromDate?: string;
  toDate?: string;
};

export type SellerShopDailyMetricsMessage = {
  requesterUserId: string;
  shopId: string;
  days?: number;
  fromDate?: string;
  toDate?: string;
};

export type SellerShopSummaryMetricsMessage = {
  requesterUserId: string;
  shopId: string;
  from?: string;
  to?: string;
};

export type SellerShopOrderStatusSummaryMessage = {
  requesterUserId: string;
  shopId: string;
};

export type ShopBestSellingProductsLookupMessage = {
  shopId: string;
  limit?: number;
};

export type AdminOrdersLookupMessage = {
  orderStatus?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
};

export type AdminFinanceReconciliationMessage = {
  fromDate?: string;
  toDate?: string;
  shopId?: string;
  orderId?: string;
  paymentStatus?: string;
  escrowStatus?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
};

export type OrderLookupMessage = {
  id: string;
  requesterUserId: string;
};

export type AdminOpenDisputeCountMessage = Record<string, never>;

export type AdminOpenDisputesLookupMessage = {
  disputeStatus?: 'OPEN' | 'RESOLVED' | 'REFUNDED';
  assignedAdminUserId?: string;
  reason?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'openedAt' | 'orderId' | 'disputeStatus';
  sortOrder?: 'asc' | 'desc';
};

export type AdminDisputeDetailMessage = {
  disputeId: string;
};

export type AdminDisputeSummaryMessage = Record<string, never>;

export type ReportTargetType = 'ORDER' | 'OFFER' | 'SHOP' | 'SOCIAL_POST' | 'SOCIAL_COMMENT';

export type CreateReportMessage = {
  requesterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string | null;
};

export type MyReportsLookupMessage = {
  requesterUserId: string;
};

export type AdminReportsLookupMessage = {
  reportStatus?: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  targetType?: ReportTargetType;
  search?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
};

export type UpdateAdminReportMessage = {
  reportId: string;
  requesterUserId: string;
  reportStatus: 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  internalNote?: string | null;
};

export type RiskTargetType = 'SHOP' | 'OFFER' | 'BATCH';

export type CalculateRiskScoreMessage = {
  targetType: RiskTargetType;
  targetId: string;
  actorUserId?: string | null;
};

export type AdminRiskScoresLookupMessage = {
  targetType?: RiskTargetType;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  search?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
};

export type ModerationCaseTargetType = 'KYC' | 'SHOP' | 'OFFER' | 'BATCH' | 'REPORT' | 'DISPUTE';

export type ModerationCaseStatus = 'ASSIGNED' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

export type AdminModerationCasesLookupMessage = {
  targetType?: ModerationCaseTargetType;
  caseStatus?: ModerationCaseStatus;
  assignedAdminUserId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
};

export type UpdateAdminModerationCaseMessage = {
  caseId: string;
  requesterUserId: string;
  caseStatus: ModerationCaseStatus;
  internalNote?: string | null;
  assignedAdminUserId?: string | null;
};

export type AssignAdminDisputeMessage = {
  disputeId: string;
  requesterUserId: string;
  internalNote?: string | null;
};

export type UpdateAdminDisputeCaseMessage = {
  disputeId: string;
  requesterUserId: string;
  caseStatus: 'ASSIGNED' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  internalNote?: string | null;
};

export type ResolveAdminDisputeMessage = {
  disputeId: string;
  requesterUserId: string;
  resolution: 'RESOLVED' | 'REFUNDED';
  internalNote?: string | null;
};

export type MarkOrderPaidMessage = {
  id: string;
  requesterUserId: string;
  providerRef?: string | null;
};

export type RetryPayOSPaymentMessage = {
  id: string;
  requesterUserId: string;
};

export type ReceiveWholesaleInventoryMessage = {
  id: string;
  requesterUserId: string;
};

export type PayOSWebhookMessage = {
  code: string;
  desc: string;
  success: boolean;
  signature: string;
  data: Record<string, unknown>;
};

export type CompleteOrderMessage = {
  id: string;
  requesterUserId: string;
};

export type CancelOrderMessage = {
  id: string;
  requesterUserId: string;
};

export type OpenOrderDisputeMessage = {
  id: string;
  requesterUserId: string;
  reason: string;
};

export type ResolveOrderDisputeMessage = {
  disputeId: string;
  requesterUserId: string;
  resolution: 'RESOLVED' | 'REFUNDED';
};

export type DisputeEvidenceUploadSignaturesMessage = {
  disputeId: string;
  requesterUserId: string;
  items: Array<{
    assetType: 'IMAGE' | 'VIDEO' | 'RAW';
  }>;
};

export type AddDisputeEvidenceBatchMessage = {
  disputeId: string;
  requesterUserId: string;
  items: Array<{
    assetType: 'IMAGE' | 'VIDEO' | 'RAW';
    mimeType: string;
    fileUrl: string;
    publicId: string;
  }>;
};

export type DisputeEvidenceLookupMessage = {
  disputeId: string;
  requesterUserId: string;
};

export type RefundOrderMessage = {
  id: string;
  requesterUserId: string;
};

export type UpdateOrderFulfillmentMessage = {
  id: string;
  requesterUserId: string;
  fulfillmentStatus: 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
};

export type BookOrderShippingMessage = {
  id: string;
  requesterUserId: string;
};

export type SyncOrderShippingStatusMessage = {
  id: string;
  requesterUserId: string;
};

export type GhnDistrictsLookupMessage = {
  provinceId: number;
};

export type GhnWardsLookupMessage = {
  districtId: number;
};

export type GhnServicesLookupMessage = {
  districtId: number;
};

export type OrderFulfillmentAuditMessage = {
  id: string;
  requesterUserId: string;
  requesterRole?: string;
};

export type CreateDistributionPricingPolicyMessage = {
  requesterUserId: string;
  networkId: string;
  scope: 'NETWORK_DEFAULT' | 'NODE_LEVEL' | 'NODE_SPECIFIC';
  nodeId?: string | null;
  appliesToLevel?: number | null;
  categoryId?: string | null;
  discountValue: number;
  minQuantity?: number | null;
  priority?: number;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type DistributionPricingPolicyLookupMessage = {
  requesterUserId: string;
  networkId: string;
};

export type ResolveWholesalePricingMessage = {
  requesterUserId?: string;
  buyerShopId: string;
  buyerDistributionNodeId?: string;
  quantity: number;
  offer: {
    price: number;
    categoryId: string;
    distributionNodeId?: string | null;
    distributionNetworkId?: string | null;
  };
};

export type CreateDistributionNetworkMessage = {
  requesterUserId: string;
  brandId: string;
  manufacturerShopId: string;
  networkName: string;
};

export type DistributionNetworksLookupMessage = {
  requesterUserId: string;
};

export type CreateDistributionNodeMessage = {
  requesterUserId: string;
  networkId: string;
  shopId: string;
  parentNodeId: string;
};

export type InviteDistributionNodeMessage = {
  requesterUserId: string;
  networkId: string;
  shopId: string;
  parentNodeId: string;
};

export type AcceptDistributionNodeInvitationMessage = {
  requesterUserId: string;
  nodeId: string;
};

export type DeclineDistributionNodeInvitationMessage = {
  requesterUserId: string;
  nodeId: string;
};

export type MyDistributionInvitationsLookupMessage = {
  requesterUserId: string;
};

export type MyDistributionMembershipsLookupMessage = {
  requesterUserId: string;
};

export type UpdateDistributionNodeStatusMessage = {
  requesterUserId: string;
  networkId: string;
  nodeId: string;
  relationshipStatus: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
};

export type DistributionNodesLookupMessage = {
  requesterUserId: string;
  networkId: string;
};

export type CreateDistributionShipmentItemMessage = {
  batchId: string;
  quantity: number;
  unitCost?: number | null;
};

export type CreateDistributionShipmentMessage = {
  requesterUserId: string;
  networkId: string;
  fromNodeId: string;
  toNodeId: string;
  shipmentCode: string;
  note?: string | null;
  items: CreateDistributionShipmentItemMessage[];
};

export type CreateSupplyBatchMessage = {
  requesterUserId: string;
  shopId: string;
  offerId?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
  modelName?: string | null;
  gtin?: string | null;
  verificationPolicy?: string | null;
  distributionNodeId?: string | null;
  batchNumber: string;
  quantity: number;
  sourceName: string;
  countryOfOrigin: string;
  sourceType: string;
  receivedAt: string;
};

export type SupplyBatchesLookupMessage = {
  requesterUserId: string;
  shopId?: string;
};

export type SupplyBatchDetailMessage = {
  requesterUserId: string;
  batchId: string;
};

export type InventorySummaryMessage = {
  requesterUserId: string;
  shopId?: string;
};

export type AdminInventoryAuditMessage = {
  batchId?: string;
  shopId?: string;
  offerId?: string;
  orderId?: string;
  search?: string;
};

export type OrderItemLineageMessage = {
  requesterUserId: string;
  orderItemId: string;
};

export type DistributionShipmentsLookupMessage = {
  requesterUserId: string;
  networkId: string;
};

export type DistributionShipmentDetailMessage = {
  requesterUserId: string;
  shipmentId: string;
};

export type ReceiveDistributionShipmentMessage = {
  requesterUserId: string;
  shipmentId: string;
};

export type DispatchDistributionShipmentMessage = {
  requesterUserId: string;
  shipmentId: string;
};

export type CancelDistributionShipmentMessage = {
  requesterUserId: string;
  shipmentId: string;
};

export type BatchDocumentUploadSignaturesMessage = {
  batchId: string;
  requesterUserId: string;
  items: Array<{
    docType: string;
  }>;
};

export type AddBatchDocumentsBatchMessage = {
  batchId: string;
  requesterUserId: string;
  items: Array<{
    docType: string;
    mimeType: string;
    fileUrl: string;
    publicId: string;
    issuerName?: string | null;
    documentNumber?: string | null;
  }>;
};

export type BatchDocumentsLookupMessage = {
  batchId: string;
  requesterUserId: string;
};

export type CreateAffiliateProgramMessage = {
  requesterUserId: string;
  ownerShopId?: string | null;
  brandId?: string | null;
  offerId?: string | null;
  scopeType: 'PLATFORM' | 'SHOP' | 'BRAND' | 'OFFER';
  name: string;
  slug: string;
  attributionWindowDays?: number;
  commissionModel?: string;
  tier1Rate: number;
  tier2Rate: number;
  rulesJson?: Record<string, unknown> | null;
  startedAt?: string | null;
  endedAt?: string | null;
};

export type AffiliateProgramsLookupMessage = {
  requesterUserId: string;
};

export type JoinAffiliateProgramMessage = {
  requesterUserId: string;
  programId: string;
  referralCode?: string | null;
};

export type AffiliateAccountsLookupMessage = {
  requesterUserId: string;
};

export type AffiliateAccountSummaryMessage = {
  requesterUserId: string;
  accountId: string;
};

export type AffiliateCommissionsLookupMessage = {
  requesterUserId: string;
  accountId: string;
};

export type AffiliateAccountConversionsLookupMessage = {
  requesterUserId: string;
  accountId: string;
};

export type AffiliateAccountPayoutsLookupMessage = {
  requesterUserId: string;
  accountId: string;
};

export type CreateAffiliateCodeMessage = {
  requesterUserId: string;
  accountId: string;
  code: string;
  landingUrl?: string | null;
  isDefault?: boolean;
  expiresAt?: string | null;
};

export type AffiliateCodesLookupMessage = {
  requesterUserId: string;
  accountId: string;
};

export type AffiliateConversionsLookupMessage = {
  requesterUserId: string;
  programId: string;
};

export type ApproveAffiliateConversionMessage = {
  requesterUserId: string;
  conversionId: string;
};

export type RejectAffiliateConversionMessage = {
  requesterUserId: string;
  conversionId: string;
};

export type CreateAffiliatePayoutMessage = {
  requesterUserId: string;
  programId: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  externalRef?: string | null;
};

export type AffiliatePayoutsLookupMessage = {
  requesterUserId: string;
  programId: string;
};

export type UpdateAffiliatePayoutStatusMessage = {
  requesterUserId: string;
  payoutId: string;
  payoutStatus: 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
};
