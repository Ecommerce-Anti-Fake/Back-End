import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min, ValidateNested } from 'class-validator';

const ADMIN_DISPUTE_STATUSES = ['OPEN', 'RESOLVED', 'REFUNDED'] as const;
const ADMIN_DISPUTE_SORT_FIELDS = ['openedAt', 'orderId', 'disputeStatus'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export class CartItemResponseDto {
  @ApiProperty({ example: 'cart-item-id' })
  id!: string;

  @ApiProperty({ example: 'offer-id' })
  offerId!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  offerTitleSnapshot!: string;

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

export class CartResponseDto {
  @ApiProperty({ example: 'cart-id' })
  id!: string;

  @ApiProperty({ example: 'buyer-user-id' })
  buyerUserId!: string;

  @ApiProperty({ example: 'ACTIVE' })
  cartStatus!: string;

  @ApiProperty({ type: CartItemResponseDto, isArray: true })
  items!: CartItemResponseDto[];

  @ApiProperty({ example: '2026-04-22T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-22T10:05:00.000Z' })
  updatedAt!: Date;
}

export class OrderItemResponseDto {
  @ApiProperty({ example: 'offer-id' })
  offerId!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  offerTitleSnapshot!: string;

  @ApiProperty({ example: 150000 })
  unitPrice!: number;

  @ApiProperty({ example: 10 })
  quantity!: number;

  @ApiProperty({ example: 'standard' })
  verificationLevelSnapshot!: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: 'order-id' })
  id!: string;

  @ApiProperty({ example: 'RETAIL' })
  orderMode!: 'RETAIL' | 'WHOLESALE';

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

  @ApiPropertyOptional({ example: 'https://pay.payos.vn/web/payment-link-id', nullable: true })
  payOSCheckoutUrl?: string | null;

  @ApiPropertyOptional({ example: 'payment-link-id', nullable: true })
  payOSPaymentLinkId?: string | null;

  @ApiPropertyOptional({ example: 1776240000123, nullable: true })
  payOSOrderCode?: number | null;

  @ApiPropertyOptional({ example: 'PENDING', nullable: true })
  escrowStatus!: string | null;

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

  @ApiPropertyOptional({ example: '12 Nguyen Trai, Quan 1, TP.HCM', nullable: true })
  shippingAddress!: string | null;

  @ApiProperty({ type: OrderItemResponseDto, isArray: true })
  items!: OrderItemResponseDto[];

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class MarkOrderPaidDto {
  @ApiPropertyOptional({ example: 'bank-transfer-ref-001' })
  @IsOptional()
  @IsString()
  providerRef?: string;
}

export class UpdateOrderFulfillmentDto {
  @ApiProperty({ example: 'SHIPPING', enum: ['PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'] })
  @IsString()
  @IsIn(['PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'])
  fulfillmentStatus!: 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
}

export class OpenOrderDisputeDto {
  @ApiProperty({ example: 'San pham nhan duoc khong dung voi mo ta' })
  @IsString()
  reason!: string;
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

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/disputes/dispute-1/proof.jpg' })
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

  @ApiPropertyOptional({ example: 'IMAGE', enum: ['IMAGE', 'VIDEO', 'RAW'], nullable: true })
  assetType!: 'IMAGE' | 'VIDEO' | 'RAW' | null;

  @ApiPropertyOptional({ example: 'disputes/dispute-1/user-1-1776240000', nullable: true })
  publicId!: string | null;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/disputes/dispute-1/proof.jpg' })
  fileUrl!: string;

  @ApiProperty({ example: '2026-04-15T10:00:00.000Z' })
  uploadedAt!: Date;
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
  @ApiProperty({ example: 'IN_REVIEW', enum: ['ASSIGNED', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'] })
  @IsString()
  @IsIn(['ASSIGNED', 'IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'])
  caseStatus!: 'ASSIGNED' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

  @ApiPropertyOptional({ example: 'Dang doi doi chieu them bang chung tu seller' })
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

export class CreateRetailOrderDto {
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

  @ApiPropertyOptional({ example: 'PAYOS', enum: ['COD', 'BANK_TRANSFER', 'PAYOS'] })
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

  @ApiPropertyOptional({ example: 'PAYOS', enum: ['COD', 'BANK_TRANSFER', 'PAYOS'] })
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
}

export class CreateWholesaleOrderDto {
  @ApiProperty({ example: 'buyer-shop-id' })
  @IsString()
  buyerShopId!: string;

  @ApiPropertyOptional({ example: 'buyer-node-id' })
  @IsOptional()
  @IsString()
  buyerDistributionNodeId?: string;

  @ApiProperty({ example: 'offer-id' })
  @IsString()
  offerId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'spring-aff-001' })
  @IsOptional()
  @IsString()
  affiliateCode?: string;

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
}
