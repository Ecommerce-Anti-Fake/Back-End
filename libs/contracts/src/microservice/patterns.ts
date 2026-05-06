export const AUTH_SERVICE_CLIENT = 'AUTH_SERVICE_CLIENT';
export const USERS_SERVICE_CLIENT = 'USERS_SERVICE_CLIENT';
export const CATALOG_SERVICE_CLIENT = 'CATALOG_SERVICE_CLIENT';
export const ORDERS_SERVICE_CLIENT = 'ORDERS_SERVICE_CLIENT';
export const AFFILIATE_SERVICE_CLIENT = 'AFFILIATE_SERVICE_CLIENT';

export const AUTH_MESSAGE_PATTERNS = {
  register: 'auth.register',
  login: 'auth.login',
  refresh: 'auth.refresh',
  logout: 'auth.logout',
  adminCheck: 'auth.admin-check',
} as const;

export const USERS_MESSAGE_PATTERNS = {
  findAll: 'users.find-all',
  getCurrentProfile: 'users.get-current-profile',
  getProfileCompletion: 'users.get-profile-completion',
  listAddresses: 'users.list-addresses',
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
  getUserById: 'users.get-user-by-id',
  updateUser: 'users.update-user',
  deleteUser: 'users.delete-user',
} as const;

export const SHOPS_MESSAGE_PATTERNS = {
  create: 'shops.create',
  updateProfile: 'shops.update-profile',
  updateRegistrationType: 'shops.update-registration-type',
  findById: 'shops.find-by-id',
  findMine: 'shops.find-mine',
  getVerificationSummary: 'shops.get-verification-summary',
  findPendingVerification: 'shops.find-pending-verification',
  getAdminVerificationSummary: 'shops.get-admin-verification-summary',
  getAdminVerificationDetail: 'shops.get-admin-verification-detail',
  findShopDocuments: 'shops.find-shop-documents',
  findShopDocumentRequirements: 'shops.find-shop-document-requirements',
  findCategoryDocuments: 'shops.find-category-documents',
  getShopDocumentUploadSignatures: 'shops.get-shop-document-upload-signatures',
  submitShopDocuments: 'shops.submit-shop-documents',
  getCategoryDocumentUploadSignatures: 'shops.get-category-document-upload-signatures',
  submitCategoryDocuments: 'shops.submit-category-documents',
  getBrandAuthorizationUploadSignatures: 'shops.get-brand-authorization-upload-signatures',
  submitBrandAuthorization: 'shops.submit-brand-authorization',
  findBrandAuthorizations: 'shops.find-brand-authorizations',
  findAdminBrandAuthorizations: 'shops.find-admin-brand-authorizations',
  reviewBrandAuthorization: 'shops.review-brand-authorization',
  reviewShopDocument: 'shops.review-shop-document',
  reviewShopCategory: 'shops.review-shop-category',
} as const;

export const PRODUCTS_MESSAGE_PATTERNS = {
  findBrands: 'products.find-brands',
  createBrand: 'products.create-brand',
  findCategories: 'products.find-categories',
  createCategory: 'products.create-category',
  findModels: 'products.find-models',
  findModelById: 'products.find-model-by-id',
  createModel: 'products.create-model',
  createOffer: 'products.create-offer',
  findOffers: 'products.find-offers',
  findOfferById: 'products.find-offer-by-id',
  allocateOfferBatches: 'products.allocate-offer-batches',
  findOfferBatchLinks: 'products.find-offer-batch-links',
  getOfferMediaUploadSignatures: 'products.get-offer-media-upload-signatures',
  addOfferMediaBatch: 'products.add-offer-media-batch',
  findOfferMedia: 'products.find-offer-media',
  getOfferDocumentUploadSignatures: 'products.get-offer-document-upload-signatures',
  addOfferDocumentsBatch: 'products.add-offer-documents-batch',
  findOfferDocuments: 'products.find-offer-documents',
} as const;

export const ORDERS_MESSAGE_PATTERNS = {
  getActiveCart: 'orders.get-active-cart',
  addCartItem: 'orders.add-cart-item',
  updateCartItem: 'orders.update-cart-item',
  removeCartItem: 'orders.remove-cart-item',
  checkoutCartItem: 'orders.checkout-cart-item',
  createRetail: 'orders.create-retail',
  createWholesale: 'orders.create-wholesale',
  findMine: 'orders.find-mine',
  findSellerShopOrders: 'orders.find-seller-shop-orders',
  findById: 'orders.find-by-id',
  getAdminOpenDisputeCount: 'orders.get-admin-open-dispute-count',
  findAdminOpenDisputes: 'orders.find-admin-open-disputes',
  getAdminDisputeSummary: 'orders.get-admin-dispute-summary',
  getAdminDisputeDetail: 'orders.get-admin-dispute-detail',
  assignAdminDispute: 'orders.assign-admin-dispute',
  updateAdminDisputeCase: 'orders.update-admin-dispute-case',
  resolveAdminDispute: 'orders.resolve-admin-dispute',
  markPaid: 'orders.mark-paid',
  handlePayOSWebhook: 'orders.handle-payos-webhook',
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

export type CurrentUserProfileCompletionMessage = {
  userId: string;
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
  isDefault?: boolean;
};

export type UpdateUserAddressMessage = {
  userId: string;
  addressId: string;
  recipientName?: string;
  phone?: string;
  addressLine?: string;
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
  fullName: string;
  dateOfBirth: string;
  phone?: string;
  idType: string;
  idNumber: string;
  documents: Array<{
    side: 'FRONT' | 'BACK';
    assetType: 'IMAGE';
    mimeType: string;
    fileUrl: string;
    publicId: string;
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
  categoryIds: string[];
};

export type UpdateShopProfileMessage = {
  shopId: string;
  requesterUserId: string;
  shopName?: string;
  businessType?: string;
  taxCode?: string | null;
};

export type UpdateShopRegistrationTypeMessage = {
  shopId: string;
  requesterUserId: string;
  registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
};

export type ShopLookupMessage = {
  id: string;
};

export type MyShopsLookupMessage = {
  ownerUserId: string;
};

export type PendingVerificationShopsLookupMessage = {
  shopStatus?: 'pending_kyc' | 'pending_verification' | 'active';
  registrationType?: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'shopName';
  sortOrder?: 'asc' | 'desc';
};

export type AdminShopVerificationDetailMessage = {
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

export type CategoryDocumentsLookupMessage = {
  shopId: string;
  categoryId: string;
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
    mimeType: string;
    fileUrl: string;
    publicId: string;
  }>;
};

export type CategoryDocumentUploadSignaturesMessage = {
  shopId: string;
  categoryId: string;
  requesterUserId: string;
  items: Array<{
    documentType: string;
  }>;
};

export type SubmitCategoryDocumentsMessage = {
  shopId: string;
  categoryId: string;
  requesterUserId: string;
  items: Array<{
    documentType: string;
    mimeType: string;
    fileUrl: string;
    publicId: string;
    documentNumber?: string | null;
    issuedBy?: string | null;
    issuedAt?: string | null;
    expiresAt?: string | null;
  }>;
};

export type ReviewShopDocumentMessage = {
  shopId: string;
  documentId: string;
  reviewerUserId: string;
  reviewStatus: 'approved' | 'rejected';
  reviewNote?: string | null;
};

export type ReviewShopCategoryMessage = {
  shopId: string;
  categoryId: string;
  reviewerUserId: string;
  registrationStatus: 'approved' | 'rejected';
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

export type ProductModelLookupMessage = {
  id: string;
};

export type CreateBrandMessage = {
  name: string;
  registryStatus?: string;
};

export type CreateCategoryMessage = {
  name: string;
  parentId?: string | null;
  riskTier?: string;
};

export type CreateProductModelMessage = {
  brandId: string;
  categoryId: string;
  modelName: string;
  gtin?: string | null;
  verificationPolicy?: string;
  approvalStatus?: string;
};

export type ListOffersMessage = {
  shopId?: string;
};

export type CreateOfferMessage = {
  sellerUserId: string;
  shopId: string;
  categoryId: string;
  productModelId: string;
  distributionNodeId?: string | null;
  title: string;
  description: string;
  price: number;
  currency?: string;
  salesMode?: 'RETAIL' | 'WHOLESALE' | 'BOTH';
  minWholesaleQty?: number | null;
  itemCondition?: string;
  availableQuantity: number;
  verificationLevel?: string;
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
  }>;
};

export type OfferMediaLookupMessage = {
  offerId: string;
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
  }>;
};

export type OfferDocumentsLookupMessage = {
  offerId: string;
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

export type CreateRetailOrderMessage = {
  buyerUserId: string;
  offerId: string;
  quantity: number;
  paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'PAYOS' | null;
  affiliateCode?: string | null;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
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
};

export type CreateWholesaleOrderMessage = {
  buyerUserId: string;
  buyerShopId: string;
  buyerDistributionNodeId?: string;
  offerId: string;
  quantity: number;
  affiliateCode?: string | null;
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
};

export type MyOrdersLookupMessage = {
  requesterUserId: string;
};

export type SellerShopOrdersLookupMessage = {
  requesterUserId: string;
  shopId: string;
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

export type CreateDistributionPricingPolicyMessage = {
  requesterUserId: string;
  networkId: string;
  scope: 'NETWORK_DEFAULT' | 'NODE_LEVEL' | 'NODE_SPECIFIC';
  nodeId?: string | null;
  appliesToLevel?: number | null;
  productModelId?: string | null;
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
  buyerShopId: string;
  buyerDistributionNodeId?: string;
  quantity: number;
  offer: {
    price: number;
    productModelId: string;
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
  productModelId: string;
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
  productModelId: string;
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
  productModelId?: string | null;
  offerId?: string | null;
  scopeType: 'PLATFORM' | 'SHOP' | 'BRAND' | 'PRODUCT_MODEL' | 'OFFER';
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
