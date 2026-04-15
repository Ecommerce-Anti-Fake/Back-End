export const AUTH_SERVICE_CLIENT = 'AUTH_SERVICE_CLIENT';
export const USERS_SERVICE_CLIENT = 'USERS_SERVICE_CLIENT';

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
  findById: 'users.find-by-id',
  findByIdentifier: 'users.find-by-identifier',
  create: 'users.create',
  getUserById: 'users.get-user-by-id',
  updateUser: 'users.update-user',
  deleteUser: 'users.delete-user',
} as const;

export const SHOPS_MESSAGE_PATTERNS = {
  create: 'shops.create',
  findById: 'shops.find-by-id',
  findMine: 'shops.find-mine',
} as const;

export const PRODUCTS_MESSAGE_PATTERNS = {
  findModels: 'products.find-models',
  findModelById: 'products.find-model-by-id',
  createOffer: 'products.create-offer',
  findOffers: 'products.find-offers',
  findOfferById: 'products.find-offer-by-id',
} as const;

export const ORDERS_MESSAGE_PATTERNS = {
  createRetail: 'orders.create-retail',
  createWholesale: 'orders.create-wholesale',
  findById: 'orders.find-by-id',
  markPaid: 'orders.mark-paid',
  complete: 'orders.complete',
  cancel: 'orders.cancel',
} as const;

export const DISTRIBUTION_MESSAGE_PATTERNS = {
  createNetwork: 'distribution.create-network',
  findNetworks: 'distribution.find-networks',
  createNode: 'distribution.create-node',
  findNodesByNetwork: 'distribution.find-nodes-by-network',
  createShipment: 'distribution.create-shipment',
  dispatchShipment: 'distribution.dispatch-shipment',
  findShipmentsByNetwork: 'distribution.find-shipments-by-network',
  receiveShipment: 'distribution.receive-shipment',
  cancelShipment: 'distribution.cancel-shipment',
  createPricingPolicy: 'distribution.create-pricing-policy',
  findPricingPoliciesByNetwork: 'distribution.find-pricing-policies-by-network',
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

export type ShopLookupMessage = {
  id: string;
};

export type MyShopsLookupMessage = {
  ownerUserId: string;
};

export type ProductModelLookupMessage = {
  id: string;
};

export type ListOffersMessage = {
  shopId?: string;
};

export type CreateOfferMessage = {
  sellerUserId: string;
  shopId: string;
  categoryId: string;
  productModelId: string;
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

export type CreateRetailOrderMessage = {
  buyerUserId: string;
  offerId: string;
  quantity: number;
  affiliateCode?: string | null;
};

export type CreateWholesaleOrderMessage = {
  buyerUserId: string;
  buyerShopId: string;
  buyerDistributionNodeId?: string;
  offerId: string;
  quantity: number;
  affiliateCode?: string | null;
};

export type OrderLookupMessage = {
  id: string;
  requesterUserId: string;
};

export type MarkOrderPaidMessage = {
  id: string;
  requesterUserId: string;
  providerRef?: string | null;
};

export type CompleteOrderMessage = {
  id: string;
  requesterUserId: string;
};

export type CancelOrderMessage = {
  id: string;
  requesterUserId: string;
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

export type DistributionShipmentsLookupMessage = {
  requesterUserId: string;
  networkId: string;
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
