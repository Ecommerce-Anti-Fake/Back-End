import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Min, ValidateNested } from 'class-validator';

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

  @ApiPropertyOptional({ example: 'PENDING', nullable: true })
  paymentStatus!: string | null;

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
}
