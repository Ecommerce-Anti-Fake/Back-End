import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const DISTRIBUTION_NODE_RELATIONSHIP_STATUSES = ['ACTIVE', 'SUSPENDED', 'TERMINATED'] as const;

export class DistributionNetworkResponseDto {
  @ApiProperty({ example: 'network-id' })
  id!: string;

  @ApiProperty({ example: 'brand-id' })
  brandId!: string;

  @ApiProperty({ example: 'manufacturer-shop-id' })
  manufacturerShopId!: string;

  @ApiProperty({ example: 'Network phan phoi chinh hang ABC' })
  networkName!: string;

  @ApiProperty({ example: 'active' })
  networkStatus!: string;

  @ApiProperty({ example: 3 })
  maxAgentDepth!: number;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class DistributionNodeResponseDto {
  @ApiProperty({ example: 'node-id' })
  id!: string;

  @ApiProperty({ example: 'network-id' })
  networkId!: string;

  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'parent-node-id', nullable: true })
  parentNodeId!: string | null;

  @ApiProperty({ example: 1 })
  level!: number;

  @ApiProperty({ example: 'AGENT_LEVEL_1' })
  nodeType!: string;

  @ApiProperty({ example: 'ACTIVE' })
  relationshipStatus!: string;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class DistributionMembershipResponseDto {
  @ApiProperty({ example: 'node-id' })
  nodeId!: string;

  @ApiProperty({ example: 'network-id' })
  networkId!: string;

  @ApiProperty({ example: 'Network phan phoi chinh hang ABC' })
  networkName!: string;

  @ApiProperty({ example: 'brand-id' })
  brandId!: string;

  @ApiProperty({ example: 'Brand ABC' })
  brandName!: string;

  @ApiProperty({ example: 'manufacturer-shop-id' })
  manufacturerShopId!: string;

  @ApiProperty({ example: 'Cong ty TNHH ABC' })
  manufacturerShopName!: string;

  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'Dai ly XYZ' })
  shopName!: string;

  @ApiProperty({ example: 'parent-node-id', nullable: true })
  parentNodeId!: string | null;

  @ApiProperty({ example: 2 })
  level!: number;

  @ApiProperty({ example: 'AGENT_LEVEL_2' })
  nodeType!: string;

  @ApiProperty({ example: 'ACTIVE' })
  relationshipStatus!: string;

  @ApiProperty({ example: '2026-04-17T12:00:00.000Z' })
  createdAt!: Date;
}

export class DistributionShipmentItemResponseDto {
  @ApiProperty({ example: 'shipment-item-id' })
  id!: string;

  @ApiProperty({ example: 'batch-id' })
  batchId!: string;

  @ApiProperty({ example: 'product-model-id' })
  productModelId!: string;

  @ApiProperty({ example: 100 })
  quantity!: number;

  @ApiPropertyOptional({ example: 120000, nullable: true })
  unitCost!: number | null;
}

export class SupplyBatchResponseDto {
  @ApiProperty({ example: 'batch-id' })
  id!: string;

  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'product-model-id' })
  productModelId!: string;

  @ApiPropertyOptional({ example: 'distribution-node-id', nullable: true })
  distributionNodeId!: string | null;

  @ApiProperty({ example: 'BATCH-2026-0001' })
  batchNumber!: string;

  @ApiProperty({ example: 500 })
  quantity!: number;

  @ApiProperty({ example: 'Nha may ABC' })
  sourceName!: string;

  @ApiProperty({ example: 'VN' })
  countryOfOrigin!: string;

  @ApiProperty({ example: 'MANUFACTURER' })
  sourceType!: string;

  @ApiProperty({ example: '2026-04-16T00:00:00.000Z' })
  receivedAt!: Date;
}

export class SupplyBatchAllocationResponseDto {
  @ApiProperty({ example: 'offer-id' })
  offerId!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  offerTitle!: string;

  @ApiProperty({ example: 120 })
  allocatedQuantity!: number;

  @ApiProperty({ example: 40 })
  consumedQuantity!: number;

  @ApiProperty({ example: 80 })
  remainingAllocatedQuantity!: number;
}

export class SupplyBatchConsumptionResponseDto {
  @ApiProperty({ example: 'order-id' })
  orderId!: string;

  @ApiProperty({ example: 'order-item-id' })
  orderItemId!: string;

  @ApiProperty({ example: 20 })
  quantity!: number;

  @ApiProperty({ example: 'pending' })
  orderStatus!: string;

  @ApiProperty({ example: '2026-04-17T09:00:00.000Z' })
  createdAt!: Date;
}

export class SupplyBatchShipmentHistoryResponseDto {
  @ApiProperty({ example: 'shipment-id' })
  shipmentId!: string;

  @ApiProperty({ example: 'SHIP-2026-0001' })
  shipmentCode!: string;

  @ApiProperty({ example: 'DELIVERED' })
  shipmentStatus!: string;

  @ApiProperty({ example: 500 })
  quantity!: number;

  @ApiProperty({ example: '2026-04-17T10:00:00.000Z' })
  createdAt!: Date;
}

export class SupplyBatchDetailResponseDto extends SupplyBatchResponseDto {
  @ApiProperty({ example: 120 })
  totalAllocatedQuantity!: number;

  @ApiProperty({ example: 40 })
  totalConsumedQuantity!: number;

  @ApiProperty({ example: 80 })
  availableForAllocation!: number;

  @ApiProperty({ type: SupplyBatchAllocationResponseDto, isArray: true })
  allocations!: SupplyBatchAllocationResponseDto[];

  @ApiProperty({ type: SupplyBatchConsumptionResponseDto, isArray: true })
  consumptions!: SupplyBatchConsumptionResponseDto[];

  @ApiProperty({ type: SupplyBatchShipmentHistoryResponseDto, isArray: true })
  shipments!: SupplyBatchShipmentHistoryResponseDto[];
}

export class InventorySummaryOfferResponseDto {
  @ApiProperty({ example: 'offer-id' })
  offerId!: string;

  @ApiProperty({ example: 'Offer 1' })
  title!: string;

  @ApiProperty({ example: 150 })
  availableQuantity!: number;

  @ApiProperty({ example: 220 })
  allocatedQuantity!: number;

  @ApiProperty({ example: 60 })
  consumedQuantity!: number;
}

export class InventorySummaryBatchResponseDto {
  @ApiProperty({ example: 'batch-id' })
  batchId!: string;

  @ApiProperty({ example: 'BATCH-2026-0001' })
  batchNumber!: string;

  @ApiProperty({ example: 'product-model-id' })
  productModelId!: string;

  @ApiProperty({ example: 500 })
  quantityOnHand!: number;

  @ApiProperty({ example: 120 })
  allocatedQuantity!: number;

  @ApiProperty({ example: 40 })
  consumedQuantity!: number;

  @ApiProperty({ example: 380 })
  unallocatedQuantity!: number;
}

export class InventorySummaryResponseDto {
  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 1200 })
  totalQuantityOnHand!: number;

  @ApiProperty({ example: 360 })
  totalAllocatedQuantity!: number;

  @ApiProperty({ example: 100 })
  totalConsumedQuantity!: number;

  @ApiProperty({ example: 840 })
  totalUnallocatedQuantity!: number;

  @ApiProperty({ type: InventorySummaryOfferResponseDto, isArray: true })
  offers!: InventorySummaryOfferResponseDto[];

  @ApiProperty({ type: InventorySummaryBatchResponseDto, isArray: true })
  batches!: InventorySummaryBatchResponseDto[];
}

export class DistributionShipmentResponseDto {
  @ApiProperty({ example: 'shipment-id' })
  id!: string;

  @ApiProperty({ example: 'network-id' })
  networkId!: string;

  @ApiProperty({ example: 'from-node-id' })
  fromNodeId!: string;

  @ApiProperty({ example: 'to-node-id' })
  toNodeId!: string;

  @ApiProperty({ example: 'SHIP-2026-0001' })
  shipmentCode!: string;

  @ApiProperty({ example: 'IN_TRANSIT' })
  shipmentStatus!: string;

  @ApiPropertyOptional({ example: 'Lo hang dot 1', nullable: true })
  note!: string | null;

  @ApiPropertyOptional({ example: '2026-04-15T09:00:00.000Z', nullable: true })
  shippedAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-04-16T14:00:00.000Z', nullable: true })
  receivedAt!: Date | null;

  @ApiProperty({
    type: DistributionShipmentItemResponseDto,
    isArray: true,
  })
  items!: DistributionShipmentItemResponseDto[];

  @ApiProperty({ example: '2026-04-15T09:00:00.000Z' })
  createdAt!: Date;
}

export class CreateDistributionNetworkDto {
  @ApiProperty({ example: 'brand-id' })
  @IsString()
  brandId!: string;

  @ApiProperty({ example: 'manufacturer-shop-id' })
  @IsString()
  manufacturerShopId!: string;

  @ApiProperty({ example: 'Network phan phoi chinh hang ABC' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  networkName!: string;
}

export class CreateDistributionNodeDto {
  @ApiProperty({ example: 'shop-id' })
  @IsString()
  shopId!: string;

  @ApiProperty({ example: 'parent-node-id' })
  @IsString()
  parentNodeId!: string;
}

export class InviteDistributionNodeDto {
  @ApiProperty({ example: 'shop-id' })
  @IsString()
  shopId!: string;

  @ApiProperty({ example: 'parent-node-id' })
  @IsString()
  parentNodeId!: string;
}

export class UpdateDistributionNodeStatusDto {
  @ApiProperty({ enum: DISTRIBUTION_NODE_RELATIONSHIP_STATUSES, example: 'SUSPENDED' })
  @IsString()
  @IsIn(DISTRIBUTION_NODE_RELATIONSHIP_STATUSES)
  relationshipStatus!: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
}

export class CreateDistributionShipmentItemDto {
  @ApiProperty({ example: 'batch-id' })
  @IsString()
  batchId!: string;

  @ApiProperty({ example: 'product-model-id' })
  @IsString()
  productModelId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  unitCost?: number;
}

export class CreateDistributionShipmentDto {
  @ApiProperty({ example: 'from-node-id' })
  @IsString()
  fromNodeId!: string;

  @ApiProperty({ example: 'to-node-id' })
  @IsString()
  toNodeId!: string;

  @ApiProperty({ example: 'SHIP-2026-0001' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  shipmentCode!: string;

  @ApiPropertyOptional({ example: 'Lo hang dot 1' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({
    type: CreateDistributionShipmentItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDistributionShipmentItemDto)
  items!: CreateDistributionShipmentItemDto[];
}

export class CreateSupplyBatchDto {
  @ApiProperty({ example: 'shop-id' })
  @IsString()
  shopId!: string;

  @ApiProperty({ example: 'product-model-id' })
  @IsString()
  productModelId!: string;

  @ApiPropertyOptional({ example: 'distribution-node-id' })
  @IsOptional()
  @IsString()
  distributionNodeId?: string;

  @ApiProperty({ example: 'BATCH-2026-0001' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  batchNumber!: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'Nha may ABC' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  sourceName!: string;

  @ApiProperty({ example: 'VN' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  countryOfOrigin!: string;

  @ApiProperty({ example: 'MANUFACTURER' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  sourceType!: string;

  @ApiProperty({ example: '2026-04-16T00:00:00.000Z' })
  @IsString()
  receivedAt!: string;
}

export class ListSupplyBatchesQueryDto {
  @ApiPropertyOptional({ example: 'shop-id' })
  @IsOptional()
  @IsString()
  shopId?: string;
}

export class BatchDocumentUploadSignatureItemDto {
  @ApiProperty({ example: 'INVOICE' })
  @IsString()
  docType!: string;
}

export class GetBatchDocumentUploadSignaturesDto {
  @ApiProperty({
    type: BatchDocumentUploadSignatureItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchDocumentUploadSignatureItemDto)
  items!: BatchDocumentUploadSignatureItemDto[];
}

export class BatchDocumentItemDto {
  @ApiProperty({ example: 'INVOICE' })
  @IsString()
  docType!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/raw/upload/v1/batches/batch-1/documents/invoice.pdf' })
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  fileUrl!: string;

  @ApiProperty({ example: 'batches/batch-1/documents/invoice' })
  @IsString()
  publicId!: string;

  @ApiPropertyOptional({ example: 'Cong ty ABC' })
  @IsOptional()
  @IsString()
  issuerName?: string;

  @ApiPropertyOptional({ example: 'INV-001' })
  @IsOptional()
  @IsString()
  documentNumber?: string;
}

export class AddBatchDocumentsBatchDto {
  @ApiProperty({
    type: BatchDocumentItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchDocumentItemDto)
  items!: BatchDocumentItemDto[];
}

export class BatchDocumentResponseDto {
  @ApiProperty({ example: 'batch-doc-1' })
  id!: string;

  @ApiProperty({ example: 'batch-1' })
  batchId!: string;

  @ApiPropertyOptional({ example: 'media-asset-1', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty({ example: 'INVOICE' })
  docType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/raw/upload/v1/batches/batch-1/documents/invoice.pdf' })
  fileUrl!: string;

  @ApiPropertyOptional({ example: 'Cong ty ABC', nullable: true })
  issuerName!: string | null;

  @ApiProperty({ example: 'pending' })
  reviewStatus!: string;

  @ApiPropertyOptional({ example: 'application/pdf', nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ example: 'batches/batch-1/documents/invoice', nullable: true })
  publicId!: string | null;

  @ApiProperty({ example: '2026-04-16T13:40:00.000Z' })
  uploadedAt!: Date;
}

export class BatchDocumentUploadSignatureResponseDto {
  @ApiProperty({ example: 'dbpa0ndt0' })
  cloudName!: string;

  @ApiProperty({ example: '123456789012345' })
  apiKey!: string;

  @ApiProperty({ example: 1776240000 })
  timestamp!: number;

  @ApiProperty({ example: 'batches/batch-1/documents' })
  folder!: string;

  @ApiProperty({ example: 'batches/batch-1/documents/user-1-1776240000-1' })
  publicId!: string;

  @ApiProperty({ example: 'raw' })
  uploadResourceType!: 'image' | 'video' | 'raw';

  @ApiProperty({ example: 'abcdef1234567890' })
  signature!: string;
}
