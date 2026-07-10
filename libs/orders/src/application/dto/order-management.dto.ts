import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const ADMIN_DISPUTE_STATUSES = ['OPEN', 'RESOLVED', 'REFUNDED'] as const;
const ADMIN_DISPUTE_SORT_FIELDS = [
  'openedAt',
  'orderId',
  'disputeStatus',
] as const;
const REPORT_TARGET_TYPES = [
  'ORDER',
  'OFFER',
  'SHOP',
  'SOCIAL_POST',
  'SOCIAL_COMMENT',
] as const;
const REPORT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'] as const;
const RISK_TARGET_TYPES = ['SHOP', 'OFFER', 'BATCH'] as const;
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const MODERATION_TARGET_TYPES = [
  'KYC',
  'SHOP',
  'OFFER',
  'BATCH',
  'REPORT',
  'DISPUTE',
] as const;
const MODERATION_CASE_STATUSES = [
  'ASSIGNED',
  'IN_REVIEW',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;
const FINANCE_ESCROW_STATUSES = [
  'PENDING',
  'HELD',
  'FROZEN',
  'RELEASED',
  'CANCELLED',
  'REFUNDED',
] as const;
export const SELLER_FULFILLMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
] as const;
export const SELLER_FULFILLMENT_STATUS_FILTERS = [
  'all',
  ...SELLER_FULFILLMENT_STATUSES,
] as const;

export type SellerFulfillmentStatus =
  (typeof SELLER_FULFILLMENT_STATUSES)[number];
export type SellerFulfillmentStatusFilter =
  (typeof SELLER_FULFILLMENT_STATUS_FILTERS)[number];

export class ShippingMethodResponseDto {
  @ApiProperty({ example: 'GHN' })
  providerCode!: string;

  @ApiProperty({ example: 'Giao Hang Nhanh' })
  providerName!: string;

  @ApiProperty({ example: 25000 })
  shippingFee!: number;

  @ApiPropertyOptional({ example: '2-3 ngay', nullable: true })
  estimatedDays!: string | null;

  @ApiProperty({ example: true })
  isEnabled!: boolean;
}

export class CartItemResponseDto {
  @ApiProperty({ example: 'cart-item-id' })
  id!: string;

  @ApiProperty({ example: 'offer-id' })
  offerId!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  offerTitleSnapshot!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/offer.jpg',
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @ApiProperty({ example: 150000 })
  unitPriceSnapshot!: number;

  @ApiProperty({ example: 'VND' })
  currencySnapshot!: string;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  shopNameSnapshot!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: '2026-04-22T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-22T10:05:00.000Z' })
  updatedAt!: Date;
}

export class CartShopGroupResponseDto {
  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  shopName!: string;

  @ApiProperty({ type: CartItemResponseDto, isArray: true })
  items!: CartItemResponseDto[];
}

export class CartResponseDto {
  @ApiProperty({ example: 'cart-id' })
  id!: string;

  @ApiProperty({ example: 'buyer-user-id' })
  buyerUserId!: string;

  @ApiProperty({ type: CartShopGroupResponseDto, isArray: true })
  shops!: CartShopGroupResponseDto[];

  @ApiProperty({ example: '2026-04-22T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-22T10:05:00.000Z' })
  updatedAt!: Date;
}

export class OrderItemBatchAllocationResponseDto {
  @ApiProperty({ example: 'batch-id' })
  batchId!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiPropertyOptional({ example: 'BATCH-2026-0001', nullable: true })
  batchNumber!: string | null;

  @ApiPropertyOptional({ example: 'Seller Shop', nullable: true })
  sourceName!: string | null;

  @ApiPropertyOptional({ example: 'VN', nullable: true })
  countryOfOrigin!: string | null;

  @ApiPropertyOptional({ example: 'WHOLESALE_ORDER', nullable: true })
  sourceType!: string | null;

  @ApiPropertyOptional({ example: 'source-order-id', nullable: true })
  sourceOrderId!: string | null;

  @ApiPropertyOptional({ example: 'source-order-item-id', nullable: true })
  sourceOrderItemId!: string | null;

  @ApiPropertyOptional({ example: '2026-05-18T10:30:00.000Z', nullable: true })
  receivedAt!: Date | null;
}

export class OrderItemResponseDto {
  @ApiProperty({ example: 'order-item-id' })
  id!: string;

  @ApiProperty({ example: 'offer-id' })
  offerId!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  offerTitleSnapshot!: string;

  @ApiProperty({ example: 150000 })
  unitPrice!: number;

  @ApiProperty({ example: 10 })
  quantity!: number;

  @ApiPropertyOptional({ example: 'review-id', nullable: true })
  reviewId!: string | null;

  @ApiPropertyOptional({ example: 5, nullable: true })
  reviewRating!: number | null;

  @ApiPropertyOptional({ example: 'San pham dung mo ta.', nullable: true })
  reviewComment!: string | null;

  @ApiPropertyOptional({ example: '2026-05-14T10:00:00.000Z', nullable: true })
  reviewCreatedAt!: Date | null;

  @ApiProperty({ example: true })
  reviewed!: boolean;

  @ApiProperty({ example: true })
  canReview!: boolean;

  @ApiProperty({ type: OrderItemBatchAllocationResponseDto, isArray: true })
  batchAllocations!: OrderItemBatchAllocationResponseDto[];
}

export class OrderShopGroupResponseDto {
  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  shopName!: string;

  @ApiProperty({ type: OrderItemResponseDto, isArray: true })
  items!: OrderItemResponseDto[];
}

export class SellerShopOrdersQueryDto {
  @ApiPropertyOptional({
    description:
      'Loc theo trang thai xu ly cua shop. Dung all hoac bo trong de lay tat ca.',
    enum: SELLER_FULFILLMENT_STATUS_FILTERS,
    example: 'all',
  })
  @IsOptional()
  @IsIn(SELLER_FULFILLMENT_STATUS_FILTERS)
  status?: SellerFulfillmentStatusFilter;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class SellerShopOrderCustomerResponseDto {
  @ApiPropertyOptional({ example: 'buyer-user-id', nullable: true })
  id!: string | null;

  @ApiPropertyOptional({ example: 'Nguyen Van A', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: 'buyer@example.com', nullable: true })
  email!: string | null;
}

export class SellerShopOrderListItemResponseDto {
  @ApiProperty({ example: 'order-id' })
  orderId!: string;

  @ApiProperty({ type: SellerShopOrderCustomerResponseDto })
  customer!: SellerShopOrderCustomerResponseDto;

  @ApiProperty({ example: 250000 })
  orderAmount!: number;

  @ApiProperty({ enum: SELLER_FULFILLMENT_STATUSES, example: 'PROCESSING' })
  status!: SellerFulfillmentStatus;

  @ApiProperty({ example: '2026-07-01T09:30:00.000Z' })
  createdAt!: Date;
}

export class PaginatedSellerShopOrderResponseDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ type: SellerShopOrderListItemResponseDto, isArray: true })
  items!: SellerShopOrderListItemResponseDto[];
}

export class OrderResponseDto {
  @ApiProperty({ example: 'order-id' })
  id!: string;

  @ApiProperty({ example: 'pending' })
  orderStatus!: string;

  @ApiProperty({ example: 'PENDING' })
  fulfillmentStatus!: string;

  @ApiPropertyOptional({ example: 'PENDING', nullable: true })
  paymentStatus!: string | null;

  @ApiPropertyOptional({ example: 'PAYOS', nullable: true })
  paymentMethod!: string | null;

  @ApiPropertyOptional({ example: 'PAYOS:payment-link-id', nullable: true })
  paymentProviderRef!: string | null;

  @ApiPropertyOptional({
    example: 'https://pay.payos.vn/web/payment-link-id',
    nullable: true,
  })
  payOSCheckoutUrl?: string | null;

  @ApiPropertyOptional({ example: 'payment-link-id', nullable: true })
  payOSPaymentLinkId?: string | null;

  @ApiPropertyOptional({ example: 1776240000123, nullable: true })
  payOSOrderCode?: number | null;

  @ApiPropertyOptional({ example: 'PENDING', nullable: true })
  escrowStatus!: string | null;

  @ApiPropertyOptional({ example: 1842750, nullable: true })
  escrowHeldAmount!: number | null;

  @ApiPropertyOptional({ example: '2026-05-21T10:00:00.000Z', nullable: true })
  escrowHoldAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-05-22T10:00:00.000Z', nullable: true })
  escrowReleaseAt!: Date | null;

  @ApiPropertyOptional({
    example: {
      id: 'dispute-id',
      reason: 'San pham nhan duoc khong dung voi mo ta',
      disputeStatus: 'OPEN',
      openedAt: '2026-04-22T10:00:00.000Z',
    },
    nullable: true,
  })
  openDispute!: {
    id: string;
    reason: string;
    disputeStatus: string;
    openedAt: Date;
  } | null;

  @ApiPropertyOptional({ example: 'dispute-id', nullable: true })
  openDisputeId!: string | null;

  @ApiProperty({ example: 'shop-id' })
  sellerShopId!: string;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  sellerShopName!: string;

  @ApiPropertyOptional({ example: 'buyer-user-id', nullable: true })
  buyerUserId!: string | null;

  @ApiPropertyOptional({ example: 'buyer-shop-id', nullable: true })
  buyerShopId!: string | null;

  @ApiPropertyOptional({ example: 'buyer-node-id', nullable: true })
  buyerDistributionNodeId!: string | null;

  @ApiProperty({ example: 2000000 })
  baseAmount!: number;

  @ApiProperty({ example: 150000 })
  discountAmount!: number;

  @ApiProperty({ example: 12750 })
  platformFeeAmount!: number;

  @ApiProperty({ example: 1842750 })
  buyerPayableAmount!: number;

  @ApiProperty({ example: 1830000 })
  sellerReceivableAmount!: number;

  @ApiProperty({ example: 1842750 })
  totalAmount!: number;

  @ApiPropertyOptional({ example: 'Nguyen Van A', nullable: true })
  shippingName!: string | null;

  @ApiPropertyOptional({ example: '0987654321', nullable: true })
  shippingPhone!: string | null;

  @ApiPropertyOptional({
    example: '12 Nguyen Trai, Quan 1, TP.HCM',
    nullable: true,
  })
  shippingAddress!: string | null;

  @ApiPropertyOptional({ example: 1450, nullable: true })
  shippingDistrictId!: number | null;

  @ApiPropertyOptional({ example: 'Quan 1', nullable: true })
  shippingDistrictName!: string | null;

  @ApiPropertyOptional({ example: '21211', nullable: true })
  shippingWardCode!: string | null;

  @ApiPropertyOptional({ example: 'Phuong Ben Nghe', nullable: true })
  shippingWardName!: string | null;

  @ApiPropertyOptional({ example: 'GHN', nullable: true })
  shippingProviderCode!: string | null;

  @ApiPropertyOptional({ example: 'Giao Hang Nhanh', nullable: true })
  shippingProviderName!: string | null;

  @ApiPropertyOptional({ example: 53320, nullable: true })
  shippingServiceId!: number | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  shippingServiceTypeId!: number | null;

  @ApiProperty({ example: 25000 })
  shippingFeeAmount!: number;

  @ApiPropertyOptional({ example: 'GHN-ABC12345', nullable: true })
  shippingTrackingCode!: string | null;

  @ApiPropertyOptional({ example: 500, nullable: true })
  parcelWeightGrams!: number | null;

  @ApiPropertyOptional({ example: 20, nullable: true })
  parcelLengthCm!: number | null;

  @ApiPropertyOptional({ example: 12, nullable: true })
  parcelWidthCm!: number | null;

  @ApiPropertyOptional({ example: 8, nullable: true })
  parcelHeightCm!: number | null;

  @ApiProperty({ type: OrderItemResponseDto, isArray: true })
  items!: OrderItemResponseDto[];

  @ApiProperty({ type: OrderShopGroupResponseDto, isArray: true })
  shops!: OrderShopGroupResponseDto[];

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class SellerDashboardAnalyticsQueryDto {
  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 31 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  days?: number;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-05-29' })
  @IsOptional()
  @IsString()
  toDate?: string;
}

export class SellerDashboardMetricDto {
  @ApiProperty({ example: 128560000 })
  value!: number;

  @ApiProperty({ example: 24.5 })
  growthPercent!: number;
}

export class SellerDashboardStatsDto {
  @ApiProperty({ type: SellerDashboardMetricDto })
  revenue!: SellerDashboardMetricDto;

  @ApiProperty({ type: SellerDashboardMetricDto })
  orders!: SellerDashboardMetricDto;

  @ApiProperty({ type: SellerDashboardMetricDto })
  products!: SellerDashboardMetricDto;

  @ApiProperty({ type: SellerDashboardMetricDto })
  newCustomers!: SellerDashboardMetricDto;
}

export class SellerDashboardRevenuePointDto {
  @ApiProperty({ example: '2026-05-29' })
  date!: string;

  @ApiProperty({ example: '29/05' })
  label!: string;

  @ApiProperty({ example: 18500000 })
  revenue!: number;

  @ApiProperty({ example: 18 })
  orders!: number;
}

export class SellerDashboardTopProductDto {
  @ApiProperty({ example: 'offer-id' })
  offerId!: string;

  @ApiProperty({ example: 'Nước hoa AntiFake Premium' })
  title!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/offer.jpg',
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @ApiProperty({ example: 1256 })
  soldQuantity!: number;

  @ApiProperty({ example: 389000000 })
  revenue!: number;
}

export class SellerDashboardRevenueOrderDto {
  @ApiProperty({ example: 'order-id' })
  orderId!: string;

  @ApiProperty({ example: '2026-05-29T10:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: 'Nguyen Van A', nullable: true })
  customerName!: string | null;

  @ApiPropertyOptional({ example: 'PAID', nullable: true })
  paymentStatus!: string | null;

  @ApiProperty({ example: 'DELIVERED' })
  fulfillmentStatus!: string;

  @ApiProperty({ example: 1842750 })
  buyerPayableAmount!: number;

  @ApiProperty({ example: 12750 })
  platformFeeAmount!: number;

  @ApiProperty({ example: 1830000 })
  sellerReceivableAmount!: number;

  @ApiProperty({ example: 2 })
  itemCount!: number;
}

export class SellerDashboardAnalyticsResponseDto {
  @ApiProperty({
    example: {
      days: 7,
      from: '2026-05-23T00:00:00.000Z',
      to: '2026-05-29T23:59:59.999Z',
    },
  })
  range!: { days: number; from: string; to: string };

  @ApiProperty({ type: SellerDashboardStatsDto })
  stats!: SellerDashboardStatsDto;

  @ApiProperty({ type: SellerDashboardRevenuePointDto, isArray: true })
  series!: SellerDashboardRevenuePointDto[];

  @ApiProperty({ type: OrderResponseDto, isArray: true })
  recentOrders!: OrderResponseDto[];

  @ApiProperty({ type: SellerDashboardTopProductDto, isArray: true })
  topProducts!: SellerDashboardTopProductDto[];

  @ApiProperty({ type: SellerDashboardRevenueOrderDto, isArray: true })
  revenueOrders!: SellerDashboardRevenueOrderDto[];
}

export class SellerShopDailyMetricsQueryDto {
  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 31 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  days?: number;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-06-07' })
  @IsOptional()
  @IsString()
  toDate?: string;
}

export class SellerShopDailyMetricPointDto {
  @ApiProperty({ example: '2026-06-01' })
  date!: string;

  @ApiProperty({ example: '01/06' })
  label!: string;

  @ApiProperty({ example: 18500000 })
  revenue!: number;

  @ApiProperty({ example: 18 })
  orders!: number;
}

export class SellerShopDailyMetricsResponseDto {
  @ApiProperty({
    example: {
      days: 7,
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-07T23:59:59.999Z',
    },
  })
  range!: { days: number; from: string; to: string };

  @ApiProperty({ type: SellerShopDailyMetricPointDto, isArray: true })
  series!: SellerShopDailyMetricPointDto[];
}

export class SellerShopSummaryMetricsQueryDto {
  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-29' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class SellerShopSummaryMetricDto {
  @ApiProperty({ example: 128500000 })
  value!: number;

  @ApiProperty({ example: 12.5 })
  growthPercent!: number;
}

export class SellerShopSummaryMetricsResponseDto {
  @ApiProperty({
    example: {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-29T23:59:59.999Z',
      days: 29,
    },
  })
  range!: { from: string; to: string; days: number };

  @ApiProperty({ type: SellerShopSummaryMetricDto })
  revenue!: SellerShopSummaryMetricDto;

  @ApiProperty({ type: SellerShopSummaryMetricDto })
  orders!: SellerShopSummaryMetricDto;

  @ApiProperty({ type: SellerShopSummaryMetricDto })
  offers!: SellerShopSummaryMetricDto;
}

export class SellerShopOrderStatusSummaryResponseDto {
  @ApiProperty({ example: 1284 })
  totalOrders!: number;

  @ApiProperty({ example: 42 })
  pendingOrders!: number;

  @ApiProperty({ example: 156 })
  shippingOrders!: number;

  @ApiProperty({ example: 1086 })
  completedOrders!: number;
}

export class AdminFinanceReconciliationQueryDto {
  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ example: 'shop-id' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ example: 'order-id' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: 'PAID' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ enum: FINANCE_ESCROW_STATUSES })
  @IsOptional()
  @IsIn(FINANCE_ESCROW_STATUSES)
  escrowStatus?: (typeof FINANCE_ESCROW_STATUSES)[number];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @ApiPropertyOptional({ enum: SORT_ORDERS })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: (typeof SORT_ORDERS)[number];
}

export class AdminFinanceReconciliationSummaryDto {
  @ApiProperty({ example: 10 })
  orderCount!: number;

  @ApiProperty({ example: 18427500 })
  buyerPayableTotal!: number;

  @ApiProperty({ example: 127500 })
  platformFeeTotal!: number;

  @ApiProperty({ example: 18300000 })
  sellerReceivableTotal!: number;

  @ApiProperty({ example: 9000000 })
  sellerPayoutReadyTotal!: number;

  @ApiProperty({ example: 5000000 })
  escrowHeldTotal!: number;

  @ApiProperty({ example: 1200000 })
  escrowFrozenTotal!: number;

  @ApiProperty({ example: 800000 })
  refundTotal!: number;

  @ApiProperty({ example: 250000 })
  affiliatePendingLiabilityTotal!: number;

  @ApiProperty({ example: 100000 })
  affiliatePaidTotal!: number;
}

export class AdminFinanceReconciliationRecordDto {
  @ApiProperty({ example: 'order-id' })
  orderId!: string;

  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'Cong ty TNHH ABC' })
  shopName!: string;

  @ApiProperty({ example: 'PAID' })
  paymentStatus!: string | null;

  @ApiProperty({ example: 'RELEASED' })
  escrowStatus!: string | null;

  @ApiProperty({ example: 'READY_FOR_PAYOUT' })
  payoutStatus!: string;

  @ApiProperty({ example: 1842750 })
  buyerPayableAmount!: number;

  @ApiProperty({ example: 12750 })
  platformFeeAmount!: number;

  @ApiProperty({ example: 1830000 })
  sellerReceivableAmount!: number;

  @ApiProperty({ example: 1830000 })
  sellerPayoutReadyAmount!: number;

  @ApiProperty({ example: 0 })
  refundAmount!: number;

  @ApiProperty({ example: 25000 })
  affiliatePendingLiabilityAmount!: number;

  @ApiProperty({ example: 0 })
  affiliatePaidAmount!: number;

  @ApiProperty({ example: '2026-05-21T10:00:00.000Z' })
  createdAt!: Date;
}

export class PaginatedAdminFinanceReconciliationResponseDto {
  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ type: AdminFinanceReconciliationSummaryDto })
  summary!: AdminFinanceReconciliationSummaryDto;

  @ApiProperty({ type: AdminFinanceReconciliationRecordDto, isArray: true })
  items!: AdminFinanceReconciliationRecordDto[];
}

export class WholesaleInventoryBatchResponseDto {
  @ApiProperty({ example: 'batch-id' })
  id!: string;

  @ApiProperty({ example: 'buyer-shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'brand-id' })
  brandId!: string;

  @ApiProperty({ example: 'category-id' })
  categoryId!: string;

  @ApiProperty({ example: 'Wholesale product carton' })
  modelName!: string;

  @ApiPropertyOptional({ example: '8930000999001', nullable: true })
  gtin!: string | null;

  @ApiProperty({ example: 'STANDARD' })
  verificationPolicy!: string;

  @ApiPropertyOptional({ example: 'buyer-node-id', nullable: true })
  distributionNodeId!: string | null;

  @ApiProperty({ example: 'WHOLESALE-ORDER001-ITEM001' })
  batchNumber!: string;

  @ApiProperty({ example: 100 })
  quantity!: number;

  @ApiProperty({ example: 'Seller Shop' })
  sourceName!: string;

  @ApiProperty({ example: 'UNKNOWN' })
  countryOfOrigin!: string;

  @ApiProperty({ example: 'WHOLESALE_ORDER' })
  sourceType!: string;

  @ApiPropertyOptional({ example: 'source-order-id', nullable: true })
  sourceOrderId!: string | null;

  @ApiPropertyOptional({ example: 'source-order-item-id', nullable: true })
  sourceOrderItemId!: string | null;

  @ApiProperty({ example: '2026-05-18T10:30:00.000Z' })
  receivedAt!: Date;
}

export class WholesaleInventoryReceiptResponseDto {
  @ApiProperty({ example: 'order-id' })
  orderId!: string;

  @ApiProperty({ example: true })
  received!: boolean;

  @ApiProperty({ type: WholesaleInventoryBatchResponseDto, isArray: true })
  batches!: WholesaleInventoryBatchResponseDto[];
}

export class MarkOrderPaidDto {
  @ApiPropertyOptional({ example: 'bank-transfer-ref-001' })
  @IsOptional()
  @IsString()
  providerRef?: string;
}

export class UpdateOrderFulfillmentDto {
  @ApiProperty({
    example: 'SHIPPING',
    enum: ['PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'],
  })
  @IsString()
  @IsIn(['PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'])
  fulfillmentStatus!: 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
}

export class OrderFulfillmentAuditEntryDto {
  @ApiProperty({ example: 'audit-log-id' })
  id!: string;

  @ApiProperty({ example: 'FULFILLMENT_STATUS_CHANGED' })
  action!: string;

  @ApiPropertyOptional({ example: 'PENDING', nullable: true })
  fromStatus!: string | null;

  @ApiPropertyOptional({ example: 'PROCESSING', nullable: true })
  toStatus!: string | null;

  @ApiPropertyOptional({ example: 'seller-user-id', nullable: true })
  actorUserId!: string | null;

  @ApiPropertyOptional({ example: 'Seller Nguyen', nullable: true })
  actorDisplayName!: string | null;

  @ApiPropertyOptional({ example: 'seller@example.com', nullable: true })
  actorEmail!: string | null;

  @ApiPropertyOptional({
    example: 'Seller moved order to processing.',
    nullable: true,
  })
  note!: string | null;

  @ApiPropertyOptional({
    example: { shippingProviderCode: 'GHN', providerStatus: 'delivered' },
    nullable: true,
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-05-15T10:00:00.000Z' })
  createdAt!: Date;
}

export class OpenOrderDisputeDto {
  @ApiProperty({ example: 'San pham nhan duoc khong dung voi mo ta' })
  @IsString()
  reason!: string;
}

export class CreateReportDto {
  @ApiProperty({ example: 'ORDER', enum: REPORT_TARGET_TYPES })
  @IsString()
  @IsIn(REPORT_TARGET_TYPES)
  targetType!: 'ORDER' | 'OFFER' | 'SHOP' | 'SOCIAL_POST' | 'SOCIAL_COMMENT';

  @ApiProperty({ example: 'target-id' })
  @IsString()
  targetId!: string;

  @ApiProperty({ example: 'Nghi ngo hang gia' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({
    example:
      'Tem niem phong bi rach va ma lo khong khop voi thong tin truy xuat.',
  })
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class ReportResponseDto {
  @ApiProperty({ example: 'report-id' })
  id!: string;

  @ApiProperty({ example: 'buyer-user-id' })
  reporterUserId!: string;

  @ApiProperty({ example: 'ORDER', enum: REPORT_TARGET_TYPES })
  targetType!: string;

  @ApiProperty({ example: 'target-id' })
  targetId!: string;

  @ApiProperty({ example: 'Nghi ngo hang gia' })
  reason!: string;

  @ApiProperty({ example: 'OPEN', enum: REPORT_STATUSES })
  reportStatus!: string;

  @ApiProperty({ example: '2026-05-20T10:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: 'Buyer Name', nullable: true })
  reporterDisplayName!: string | null;

  @ApiPropertyOptional({ example: 'buyer@example.com', nullable: true })
  reporterEmail!: string | null;

  @ApiPropertyOptional({ example: 'Shop ABC', nullable: true })
  targetLabel!: string | null;
}

export class MyReportsResponseDto {
  @ApiProperty({ type: ReportResponseDto, isArray: true })
  items!: ReportResponseDto[];
}

export class AdminReportQueryDto {
  @ApiPropertyOptional({ example: 'OPEN', enum: REPORT_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(REPORT_STATUSES)
  reportStatus?: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'OFFER', enum: REPORT_TARGET_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(REPORT_TARGET_TYPES)
  targetType?: 'ORDER' | 'OFFER' | 'SHOP' | 'SOCIAL_POST' | 'SOCIAL_COMMENT';

  @ApiPropertyOptional({ example: 'hang gia' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @ApiPropertyOptional({ example: 'desc', enum: SORT_ORDERS })
  @IsOptional()
  @IsString()
  @IsIn(SORT_ORDERS)
  sortOrder?: 'asc' | 'desc';
}

export class PaginatedAdminReportResponseDto {
  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ type: ReportResponseDto, isArray: true })
  items!: ReportResponseDto[];
}

export class UpdateAdminReportDto {
  @ApiProperty({
    example: 'IN_REVIEW',
    enum: ['IN_REVIEW', 'RESOLVED', 'REJECTED'],
  })
  @IsString()
  @IsIn(['IN_REVIEW', 'RESOLVED', 'REJECTED'])
  reportStatus!: 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Da lien he shop de xac minh.' })
  @IsOptional()
  @IsString()
  internalNote?: string | null;
}

export class RiskScoreFactorDto {
  @ApiProperty({ example: 'openReports' })
  key!: string;

  @ApiProperty({ example: 2 })
  value!: number | string | boolean | null;

  @ApiProperty({ example: 30 })
  impact!: number;

  @ApiProperty({ example: '2 report dang mo hoac dang xu ly' })
  label!: string;
}

export class RiskScoreResponseDto {
  @ApiProperty({ example: 'risk-score-id' })
  id!: string;

  @ApiProperty({ example: 'SHOP', enum: RISK_TARGET_TYPES })
  targetType!: string;

  @ApiProperty({ example: 'target-id' })
  targetId!: string;

  @ApiPropertyOptional({ example: 'Shop ABC', nullable: true })
  targetLabel!: string | null;

  @ApiProperty({ example: 62.5 })
  score!: number;

  @ApiProperty({ example: 'HIGH', enum: RISK_LEVELS })
  riskLevel!: string;

  @ApiProperty({ type: RiskScoreFactorDto, isArray: true })
  factors!: RiskScoreFactorDto[];

  @ApiProperty({ example: '2026-05-21T10:00:00.000Z' })
  calculatedAt!: Date;
}

export class AdminRiskScoreQueryDto {
  @ApiPropertyOptional({ example: 'SHOP', enum: RISK_TARGET_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(RISK_TARGET_TYPES)
  targetType?: 'SHOP' | 'OFFER' | 'BATCH';

  @ApiPropertyOptional({ example: 'HIGH', enum: RISK_LEVELS })
  @IsOptional()
  @IsString()
  @IsIn(RISK_LEVELS)
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({ example: 'shop-id' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @ApiPropertyOptional({ example: 'desc', enum: SORT_ORDERS })
  @IsOptional()
  @IsString()
  @IsIn(SORT_ORDERS)
  sortOrder?: 'asc' | 'desc';
}

export class PaginatedAdminRiskScoreResponseDto {
  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ type: RiskScoreResponseDto, isArray: true })
  items!: RiskScoreResponseDto[];
}

export class CalculateRiskScoreDto {
  @ApiProperty({ example: 'SHOP', enum: RISK_TARGET_TYPES })
  @IsString()
  @IsIn(RISK_TARGET_TYPES)
  targetType!: 'SHOP' | 'OFFER' | 'BATCH';

  @ApiProperty({ example: 'target-id' })
  @IsString()
  targetId!: string;
}

export class AdminModerationCaseResponseDto {
  @ApiProperty({ example: 'moderation-case-id' })
  id!: string;

  @ApiProperty({ example: 'OFFER', enum: MODERATION_TARGET_TYPES })
  targetType!: string;

  @ApiProperty({ example: 'target-id' })
  targetId!: string;

  @ApiProperty({ example: 'Risk score CRITICAL (96)' })
  reason!: string;

  @ApiProperty({ example: 'ESCALATED', enum: MODERATION_CASE_STATUSES })
  caseStatus!: string;

  @ApiPropertyOptional({
    example: 'Can xu ly truoc khi cho hien thi lai.',
    nullable: true,
  })
  internalNote!: string | null;

  @ApiPropertyOptional({ example: 'admin-user-id', nullable: true })
  assignedAdminUserId!: string | null;

  @ApiPropertyOptional({ example: 'Admin Name', nullable: true })
  assignedAdminDisplayName!: string | null;

  @ApiPropertyOptional({ example: 'admin@example.com', nullable: true })
  assignedAdminEmail!: string | null;

  @ApiProperty({ example: '2026-05-21T10:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2026-05-21T11:00:00.000Z', nullable: true })
  resolvedAt!: Date | null;
}

export class AdminModerationCaseQueryDto {
  @ApiPropertyOptional({ example: 'OFFER', enum: MODERATION_TARGET_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(MODERATION_TARGET_TYPES)
  targetType?: 'KYC' | 'SHOP' | 'OFFER' | 'BATCH' | 'REPORT' | 'DISPUTE';

  @ApiPropertyOptional({ example: 'IN_REVIEW', enum: MODERATION_CASE_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(MODERATION_CASE_STATUSES)
  caseStatus?: 'ASSIGNED' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

  @ApiPropertyOptional({ example: 'admin-user-id' })
  @IsOptional()
  @IsString()
  assignedAdminUserId?: string;

  @ApiPropertyOptional({ example: 'target-id hoac reason' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;

  @ApiPropertyOptional({ example: 'desc', enum: SORT_ORDERS })
  @IsOptional()
  @IsString()
  @IsIn(SORT_ORDERS)
  sortOrder?: 'asc' | 'desc';
}

export class PaginatedAdminModerationCaseResponseDto {
  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ type: AdminModerationCaseResponseDto, isArray: true })
  items!: AdminModerationCaseResponseDto[];
}

export class UpdateAdminModerationCaseDto {
  @ApiProperty({ example: 'IN_REVIEW', enum: MODERATION_CASE_STATUSES })
  @IsString()
  @IsIn(MODERATION_CASE_STATUSES)
  caseStatus!: 'ASSIGNED' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

  @ApiPropertyOptional({ example: 'admin-user-id' })
  @IsOptional()
  @IsString()
  assignedAdminUserId?: string | null;

  @ApiPropertyOptional({
    example: 'Da kiem tra bang chung va can doi chieu nha cung cap.',
  })
  @IsOptional()
  @IsString()
  internalNote?: string | null;
}

export class ResolveOrderDisputeDto {
  @ApiProperty({ example: 'RESOLVED', enum: ['RESOLVED', 'REFUNDED'] })
  @IsString()
  @IsIn(['RESOLVED', 'REFUNDED'])
  resolution!: 'RESOLVED' | 'REFUNDED';
}

export class DisputeEvidenceAssetTypeDto {
  @ApiProperty({ example: 'IMAGE', enum: ['IMAGE', 'VIDEO', 'RAW'] })
  @IsString()
  @IsIn(['IMAGE', 'VIDEO', 'RAW'])
  assetType!: 'IMAGE' | 'VIDEO' | 'RAW';
}

export class DisputeEvidenceUploadSignatureResponseDto {
  @ApiProperty({ example: 'dbpa0ndt0' })
  cloudName!: string;

  @ApiProperty({ example: '123456789012345' })
  apiKey!: string;

  @ApiProperty({ example: 1776240000 })
  timestamp!: number;

  @ApiProperty({ example: 'disputes/dispute-123' })
  folder!: string;

  @ApiProperty({ example: 'dispute-123/user-1-1776240000' })
  publicId!: string;

  @ApiProperty({ example: 'image', enum: ['image', 'video', 'raw'] })
  uploadResourceType!: 'image' | 'video' | 'raw';

  @ApiProperty({ example: 'abcdef1234567890' })
  signature!: string;
}

export class GetDisputeEvidenceUploadSignaturesDto {
  @ApiProperty({
    type: DisputeEvidenceAssetTypeDto,
    isArray: true,
    example: [{ assetType: 'IMAGE' }, { assetType: 'VIDEO' }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DisputeEvidenceAssetTypeDto)
  items!: DisputeEvidenceAssetTypeDto[];
}

export class AddDisputeEvidenceDto {
  @ApiProperty({ example: 'IMAGE', enum: ['IMAGE', 'VIDEO', 'RAW'] })
  @IsString()
  @IsIn(['IMAGE', 'VIDEO', 'RAW'])
  assetType!: 'IMAGE' | 'VIDEO' | 'RAW';

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/example/image/upload/v1/disputes/dispute-1/proof.jpg',
  })
  @IsString()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
  })
  fileUrl!: string;

  @ApiProperty({ example: 'disputes/dispute-1/user-1-1776240000' })
  @IsString()
  publicId!: string;
}

export class AddDisputeEvidenceBatchDto {
  @ApiProperty({
    type: AddDisputeEvidenceDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddDisputeEvidenceDto)
  items!: AddDisputeEvidenceDto[];
}

export class DisputeEvidenceResponseDto {
  @ApiProperty({ example: 'evidence-id' })
  id!: string;

  @ApiProperty({ example: 'dispute-id' })
  disputeId!: string;

  @ApiProperty({ example: 'user-id' })
  uploadedByUserId!: string;

  @ApiPropertyOptional({ example: 'media-asset-id', nullable: true })
  mediaAssetId!: string | null;

  @ApiPropertyOptional({ example: 'image/jpeg', nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({
    example: 'IMAGE',
    enum: ['IMAGE', 'VIDEO', 'RAW'],
    nullable: true,
  })
  assetType!: 'IMAGE' | 'VIDEO' | 'RAW' | null;

  @ApiPropertyOptional({
    example: 'disputes/dispute-1/user-1-1776240000',
    nullable: true,
  })
  publicId!: string | null;

  @ApiProperty({
    example:
      'https://res.cloudinary.com/example/image/upload/v1/disputes/dispute-1/proof.jpg',
  })
  fileUrl!: string;

  @ApiProperty({ example: '2026-04-15T10:00:00.000Z' })
  uploadedAt!: Date;
}

export class AdminDisputeShopDto {
  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  shopName!: string;
}

export class AdminOpenDisputeResponseDto {
  @ApiProperty({ example: 'dispute-id' })
  id!: string;

  @ApiProperty({ example: 'order-id' })
  orderId!: string;

  @ApiProperty({ example: 'OPEN' })
  disputeStatus!: string;

  @ApiProperty({ example: 'San pham nhan duoc khong dung voi mo ta' })
  reason!: string;

  @ApiProperty({ example: 'user-id' })
  openedByUserId!: string;

  @ApiProperty({ example: 'shop-id' })
  sellerShopId!: string;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  sellerShopName!: string;

  @ApiProperty({ type: AdminDisputeShopDto, isArray: true })
  shops!: AdminDisputeShopDto[];

  @ApiPropertyOptional({ example: 'buyer-user-id', nullable: true })
  buyerUserId!: string | null;

  @ApiPropertyOptional({ example: 'buyer-shop-id', nullable: true })
  buyerShopId!: string | null;

  @ApiProperty({ example: 'paid' })
  orderStatus!: string;

  @ApiProperty({ example: '2026-04-16T09:00:00.000Z' })
  openedAt!: Date;
}

export class AdminOpenDisputeQueryDto {
  @ApiPropertyOptional({
    description: 'Loc theo trang thai dispute. Route nay mac dinh la OPEN.',
    enum: ADMIN_DISPUTE_STATUSES,
    example: 'OPEN',
  })
  @IsOptional()
  @IsString()
  @IsIn(ADMIN_DISPUTE_STATUSES)
  disputeStatus?: 'OPEN' | 'RESOLVED' | 'REFUNDED';

  @ApiPropertyOptional({
    description: 'Loc theo admin dang duoc assign moderation case.',
    example: 'admin-user-id',
  })
  @IsOptional()
  @IsString()
  assignedAdminUserId?: string;

  @ApiPropertyOptional({
    description: 'Loc theo noi dung ly do dispute.',
    example: 'hang sai',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Tu khoa tim theo ly do, ma order hoac ten shop.',
    example: 'factory shop',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Trang hien tai.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'So phan tu moi trang.',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Truong sap xep danh sach dispute moderation.',
    enum: ADMIN_DISPUTE_SORT_FIELDS,
    example: 'openedAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(ADMIN_DISPUTE_SORT_FIELDS)
  sortBy?: 'openedAt' | 'orderId' | 'disputeStatus';

  @ApiPropertyOptional({
    description: 'Thu tu sap xep.',
    enum: SORT_ORDERS,
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(SORT_ORDERS)
  sortOrder?: 'asc' | 'desc';
}

export class PaginatedAdminOpenDisputeResponseDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 14 })
  total!: number;

  @ApiProperty({ type: AdminOpenDisputeResponseDto, isArray: true })
  items!: AdminOpenDisputeResponseDto[];
}

export class AdminDisputeDetailResponseDto {
  @ApiProperty({ type: AdminOpenDisputeResponseDto })
  dispute!: AdminOpenDisputeResponseDto;

  @ApiPropertyOptional({
    description: 'Thong tin moderation case noi bo cua admin.',
    nullable: true,
  })
  moderationCase!: {
    id: string;
    caseStatus: string;
    internalNote: string | null;
    assignedAdminUserId: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
  } | null;

  @ApiProperty({ type: OrderResponseDto })
  order!: OrderResponseDto;

  @ApiProperty({ type: DisputeEvidenceResponseDto, isArray: true })
  evidence!: DisputeEvidenceResponseDto[];

  @ApiProperty({
    description: 'Timeline xu ly dispute.',
    isArray: true,
  })
  timeline!: Array<{
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    note: string | null;
    actorUserId: string;
    actorDisplayName: string | null;
    actorEmail: string | null;
    createdAt: Date;
  }>;
}

export class AssignAdminDisputeDto {
  @ApiPropertyOptional({ example: 'Nhan xu ly dispute nay' })
  @IsOptional()
  @IsString()
  internalNote?: string;
}

export class UpdateAdminDisputeCaseDto {
  @ApiProperty({
    example: 'IN_REVIEW',
    enum: ['ASSIGNED', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  })
  @IsString()
  @IsIn(['ASSIGNED', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'])
  caseStatus!: 'ASSIGNED' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

  @ApiPropertyOptional({
    example: 'Dang doi doi chieu them bang chung tu seller',
  })
  @IsOptional()
  @IsString()
  internalNote?: string;
}

export class ResolveAdminDisputeDto {
  @ApiProperty({ example: 'REFUNDED', enum: ['RESOLVED', 'REFUNDED'] })
  @IsString()
  @IsIn(['RESOLVED', 'REFUNDED'])
  resolution!: 'RESOLVED' | 'REFUNDED';

  @ApiPropertyOptional({ example: 'Admin quyet dinh refund do seller vi pham' })
  @IsOptional()
  @IsString()
  internalNote?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ example: 'buyer-shop-id', nullable: true })
  @IsOptional()
  @IsString()
  buyerShopId?: string;

  @ApiPropertyOptional({ example: 'buyer-node-id', nullable: true })
  @IsOptional()
  @IsString()
  buyerDistributionNodeId?: string;

  @ApiProperty({ example: 'offer-id' })
  @IsString()
  offerId!: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'spring-aff-001' })
  @IsOptional()
  @IsString()
  affiliateCode?: string;

  @ApiPropertyOptional({
    example: 'PAYOS',
    enum: ['COD', 'BANK_TRANSFER', 'PAYOS'],
  })
  @IsOptional()
  @IsIn(['COD', 'BANK_TRANSFER', 'PAYOS'])
  paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'PAYOS';

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  shippingName?: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @IsOptional()
  @IsString()
  shippingPhone?: string;

  @ApiPropertyOptional({ example: '12 Nguyen Trai, Quan 1, TP.HCM' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 1450 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shippingDistrictId?: number;

  @ApiPropertyOptional({ example: 'Quan 1' })
  @IsOptional()
  @IsString()
  shippingDistrictName?: string;

  @ApiPropertyOptional({ example: '21211' })
  @IsOptional()
  @IsString()
  shippingWardCode?: string;

  @ApiPropertyOptional({ example: 'Phuong Ben Nghe' })
  @IsOptional()
  @IsString()
  shippingWardName?: string;

  @ApiPropertyOptional({ example: 'GHN' })
  @IsOptional()
  @IsString()
  shippingProviderCode?: string;

  @ApiPropertyOptional({ example: 53320 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shippingServiceId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shippingServiceTypeId?: number;
}

export class AddCartItemDto {
  @ApiProperty({ example: 'offer-id' })
  @IsString()
  offerId!: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CheckoutCartItemDto {
  @ApiPropertyOptional({ example: 'spring-aff-001' })
  @IsOptional()
  @IsString()
  affiliateCode?: string;

  @ApiPropertyOptional({
    example: 'PAYOS',
    enum: ['COD', 'BANK_TRANSFER', 'PAYOS'],
  })
  @IsOptional()
  @IsIn(['COD', 'BANK_TRANSFER', 'PAYOS'])
  paymentMethod?: 'COD' | 'BANK_TRANSFER' | 'PAYOS';

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  shippingName?: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @IsOptional()
  @IsString()
  shippingPhone?: string;

  @ApiPropertyOptional({ example: '12 Nguyen Trai, Quan 1, TP.HCM' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 1450 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shippingDistrictId?: number;

  @ApiPropertyOptional({ example: 'Quan 1' })
  @IsOptional()
  @IsString()
  shippingDistrictName?: string;

  @ApiPropertyOptional({ example: '21211' })
  @IsOptional()
  @IsString()
  shippingWardCode?: string;

  @ApiPropertyOptional({ example: 'Phuong Ben Nghe' })
  @IsOptional()
  @IsString()
  shippingWardName?: string;

  @ApiPropertyOptional({ example: 'GHN' })
  @IsOptional()
  @IsString()
  shippingProviderCode?: string;

  @ApiPropertyOptional({ example: 53320 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shippingServiceId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shippingServiceTypeId?: number;
}

export class CheckoutCartDto {
  @ApiProperty({
    description: 'Danh sach cart item duoc buyer chon de checkout.',
    example: ['cart-item-id-1', 'cart-item-id-2'],
    type: String,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  cartItemIds!: string[];

  @ApiProperty({ example: 'PAYOS', enum: ['COD', 'PAYOS'] })
  @IsIn(['COD', 'PAYOS'])
  paymentMethod!: 'COD' | 'PAYOS';

  @ApiProperty({ example: 'GHN_1' })
  @IsString()
  shippingOptionCode!: string;

  @ApiPropertyOptional({ example: 'spring-aff-001' })
  @IsOptional()
  @IsString()
  affiliateCode?: string;
}

export class CheckoutCartCodResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'order-id' })
  orderId!: string;
}

export class CheckoutCartPayOSResponseDto {
  @ApiProperty({ example: 'order-id' })
  orderId!: string;

  @ApiProperty({ example: 1776240000123 })
  orderCode!: number;

  @ApiProperty({ example: 'payment-link-id' })
  paymentLinkId!: string;

  @ApiProperty({ example: 'https://pay.payos.vn/web/payment-link-id' })
  checkoutUrl!: string;
}

export class QuoteCartItemShippingOptionsDto {
  @ApiPropertyOptional({
    example: '12 Nguyen Trai, Phuong Ben Nghe, Quan 1, TP.HCM',
  })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 1450 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shippingDistrictId?: number;

  @ApiPropertyOptional({ example: '21211' })
  @IsOptional()
  @IsString()
  shippingWardCode?: string;
}

export class QuoteCartShippingOptionsDto {
  @ApiProperty({
    description: 'Danh sach cart item duoc buyer chon de bao gia van chuyen.',
    example: ['cart-item-id-1', 'cart-item-id-2'],
    type: String,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  cartItemIds!: string[];
}

export class CartItemShippingOptionResponseDto {
  @ApiProperty({ example: 'GHN' })
  providerCode!: string;

  @ApiProperty({ example: 'Giao Hang Nhanh' })
  providerName!: string;

  @ApiProperty({ example: 'Giao hang tieu chuan' })
  label!: string;

  @ApiPropertyOptional({ example: 'Service 53320', nullable: true })
  description!: string | null;

  @ApiProperty({ example: 30000 })
  shippingFee!: number;

  @ApiPropertyOptional({ example: 53320, nullable: true })
  shippingServiceId!: number | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  shippingServiceTypeId!: number | null;
}

export class CartShippingOptionResponseDto {
  @ApiProperty({ example: 'GHN_1' })
  optionCode!: string;

  @ApiProperty({ example: 'GHN' })
  providerCode!: string;

  @ApiProperty({ example: 'Giao Hang Nhanh' })
  providerName!: string;

  @ApiProperty({ example: 'Nhanh' })
  methodName!: string;

  @ApiProperty({ example: 30000 })
  shippingFee!: number;

  @ApiPropertyOptional({ example: '2-3 ngay', nullable: true })
  estimatedDelivery!: string | null;
}

export class CartShopShippingOptionsResponseDto {
  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'Shop A' })
  shopName!: string;

  @ApiProperty({ type: [CartShippingOptionResponseDto] })
  options!: CartShippingOptionResponseDto[];
}

export class CartShippingOptionsResponseDto {
  @ApiProperty({ type: [CartShippingOptionResponseDto] })
  options!: CartShippingOptionResponseDto[];
}

export class GhnProvinceResponseDto {
  @ApiProperty({ example: 202 })
  provinceId!: number;

  @ApiProperty({ example: 'Ho Chi Minh' })
  provinceName!: string;
}

export class GhnDistrictResponseDto {
  @ApiProperty({ example: 1450 })
  districtId!: number;

  @ApiProperty({ example: 'Quan 1' })
  districtName!: string;
}

export class GhnWardResponseDto {
  @ApiProperty({ example: '21211' })
  wardCode!: string;

  @ApiProperty({ example: 'Phuong Ben Nghe' })
  wardName!: string;
}

export class GhnServiceResponseDto {
  @ApiPropertyOptional({ example: 53320, nullable: true })
  serviceId!: number | null;

  @ApiProperty({ example: 2 })
  serviceTypeId!: number;

  @ApiProperty({ example: 'Hang nhe' })
  shortName!: string;
}

export class ShopBestSellingProductsQueryDto {
  @ApiPropertyOptional({ example: 10, default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class ShopBestSellingProductDto {
  @ApiProperty({ example: '06b5f15b-4c48-4f57-a2d6-0f2eb45fd001' })
  id!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  title!: string;

  @ApiProperty({ example: 150000 })
  price!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: 500 })
  availableQuantity!: number;

  @ApiProperty({ example: 120 })
  soldQuantity!: number;

  @ApiProperty({ example: 'active' })
  offerStatus!: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}
