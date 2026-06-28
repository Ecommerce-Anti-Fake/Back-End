import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const OFFER_SALES_MODES = ['RETAIL', 'WHOLESALE', 'BOTH'] as const;
const OFFER_STATUSES = ['active', 'inactive', 'draft'] as const;
const SHOP_TYPES = [
  'NORMAL',
  'HANDMADE',
  'MANUFACTURER',
  'DISTRIBUTOR',
] as const;
const OFFER_SALES_CHANNELS = ['retail', 'wholesale', 'all'] as const;
const OFFER_SORTS = ['featured', 'newest', 'price-asc', 'price-desc'] as const;

export class OfferShippingMethodResponseDto {
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

export class OfferResponseDto {
  @ApiProperty({ example: '06b5f15b-4c48-4f57-a2d6-0f2eb45fd001' })
  id!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  title!: string;

  @ApiProperty({ example: 'Mo ta san pham' })
  description!: string;

  @ApiProperty({ example: 150000 })
  price!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ enum: OFFER_SALES_MODES, example: 'WHOLESALE' })
  salesMode!: 'RETAIL' | 'WHOLESALE' | 'BOTH';

  @ApiPropertyOptional({ example: 50, nullable: true })
  minWholesaleQty!: number | null;

  @ApiProperty({ example: 'new' })
  itemCondition!: string;

  @ApiProperty({ example: 500 })
  availableQuantity!: number;

  @ApiPropertyOptional({ example: 500, nullable: true })
  parcelWeightGrams!: number | null;

  @ApiPropertyOptional({ example: 20, nullable: true })
  parcelLengthCm!: number | null;

  @ApiPropertyOptional({ example: 12, nullable: true })
  parcelWidthCm!: number | null;

  @ApiPropertyOptional({ example: 8, nullable: true })
  parcelHeightCm!: number | null;

  @ApiProperty({ example: 120 })
  soldQuantity!: number;

  @ApiProperty({ example: 'standard' })
  verificationLevel!: string;

  @ApiProperty({ example: 'active' })
  offerStatus!: string;

  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'category-id' })
  categoryId!: string | null;

  @ApiPropertyOptional({ example: 'brand-id', nullable: true })
  brandId!: string | null;

  @ApiPropertyOptional({ example: '8938505970012', nullable: true })
  gtin!: string | null;

  @ApiProperty({ example: 'manual_review' })
  verificationPolicy!: string;

  @ApiPropertyOptional({ example: 'seller-node-id', nullable: true })
  distributionNodeId!: string | null;

  @ApiPropertyOptional({ example: 'network-id', nullable: true })
  distributionNetworkId!: string | null;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  shopName!: string;

  @ApiProperty({ example: 'MANUFACTURER' })
  shopType!: string;

  @ApiProperty({ example: 'My pham' })
  categoryName!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50' })
  productModelName!: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @ApiProperty({
    example: [
      'https://res.cloudinary.com/demo/image/upload/product.jpg',
      'https://res.cloudinary.com/demo/image/upload/product-gallery-1.jpg',
    ],
    isArray: true,
  })
  imageUrls!: string[];

  @ApiProperty({ type: OfferShippingMethodResponseDto, isArray: true })
  shippingMethods!: OfferShippingMethodResponseDto[];

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class CreateOfferResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    example: 'Offer created successfully and is pending moderation.',
  })
  message!: string;
}

export class PublicOfferDetailResponseDto {
  @ApiProperty({ example: '06b5f15b-4c48-4f57-a2d6-0f2eb45fd001' })
  id!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  title!: string;

  @ApiProperty({ example: 'Mo ta san pham' })
  description!: string;

  @ApiProperty({ example: 150000 })
  price!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ enum: OFFER_SALES_MODES, example: 'WHOLESALE' })
  salesMode!: 'RETAIL' | 'WHOLESALE' | 'BOTH';

  @ApiPropertyOptional({ example: 50, nullable: true })
  minWholesaleQty!: number | null;

  @ApiProperty({ example: 'new' })
  itemCondition!: string;

  @ApiProperty({ example: 500 })
  availableQuantity!: number;

  @ApiPropertyOptional({ example: 500, nullable: true })
  parcelWeightGrams!: number | null;

  @ApiPropertyOptional({ example: 20, nullable: true })
  parcelLengthCm!: number | null;

  @ApiPropertyOptional({ example: 12, nullable: true })
  parcelWidthCm!: number | null;

  @ApiPropertyOptional({ example: 8, nullable: true })
  parcelHeightCm!: number | null;

  @ApiProperty({ example: 120 })
  soldQuantity!: number;

  @ApiProperty({ example: 'standard' })
  verificationLevel!: string;

  @ApiProperty({ example: 'active' })
  offerStatus!: string;

  @ApiProperty({ example: 'category-id' })
  categoryId!: string | null;

  @ApiPropertyOptional({ example: 'brand-id', nullable: true })
  brandId!: string | null;

  @ApiPropertyOptional({ example: '8938505970012', nullable: true })
  gtin!: string | null;

  @ApiProperty({ example: 'manual_review' })
  verificationPolicy!: string;

  @ApiPropertyOptional({ example: 'seller-node-id', nullable: true })
  distributionNodeId!: string | null;

  @ApiPropertyOptional({ example: 'network-id', nullable: true })
  distributionNetworkId!: string | null;

  @ApiProperty({ example: 'My pham' })
  categoryName!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50' })
  productModelName!: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @ApiProperty({
    example: [
      'https://res.cloudinary.com/demo/image/upload/product.jpg',
      'https://res.cloudinary.com/demo/image/upload/product-gallery-1.jpg',
    ],
    isArray: true,
  })
  imageUrls!: string[];

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class OfferListItemResponseDto {
  @ApiProperty({ example: '06b5f15b-4c48-4f57-a2d6-0f2eb45fd001' })
  id!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  title!: string;

  @ApiProperty({ example: 150000 })
  price!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ enum: OFFER_SALES_MODES, example: 'RETAIL' })
  salesMode!: 'RETAIL' | 'WHOLESALE' | 'BOTH';

  @ApiPropertyOptional({ example: 50, nullable: true })
  minWholesaleQty!: number | null;

  @ApiProperty({ example: 500 })
  availableQuantity!: number;

  @ApiProperty({ example: 120 })
  soldQuantity!: number;

  @ApiProperty({ example: 'standard' })
  verificationLevel!: string;

  @ApiProperty({ example: 'active' })
  offerStatus!: string;

  @ApiProperty({ example: 'category-id', nullable: true })
  categoryId!: string | null;

  @ApiPropertyOptional({ example: 'brand-id', nullable: true })
  brandId!: string | null;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class PaginatedOfferListResponseDto {
  @ApiProperty({ example: 120 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ type: OfferListItemResponseDto, isArray: true })
  items!: OfferListItemResponseDto[];
}

export class ListShopOffersQueryDto {
  @ApiPropertyOptional({
    description: '1-based page number.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page. Maximum 100.',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class OfferBatchLinkItemDto {
  @ApiProperty({ example: 'batch-id' })
  @IsString()
  batchId!: string;

  @ApiProperty({ example: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  allocatedQuantity!: number;
}

export class AllocateOfferBatchesDto {
  @ApiProperty({ type: OfferBatchLinkItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferBatchLinkItemDto)
  items!: OfferBatchLinkItemDto[];
}

export class OfferBatchLinkResponseDto {
  @ApiProperty({ example: 'offer-batch-link-id' })
  id!: string;

  @ApiProperty({ example: 'offer-id' })
  offerId!: string;

  @ApiProperty({ example: 'batch-id' })
  batchId!: string;

  @ApiProperty({ example: 200 })
  allocatedQuantity!: number;

  @ApiProperty({ example: 'BATCH-2026-0001' })
  batchNumber!: string;

  @ApiProperty({ example: 500 })
  batchQuantity!: number;

  @ApiProperty({ example: 'Nha may ABC' })
  sourceName!: string;

  @ApiProperty({ example: 'VN' })
  countryOfOrigin!: string;

  @ApiProperty({ example: 'MANUFACTURER' })
  sourceType!: string;

  @ApiPropertyOptional({ example: 'source-order-id', nullable: true })
  sourceOrderId!: string | null;

  @ApiPropertyOptional({ example: 'source-order-item-id', nullable: true })
  sourceOrderItemId!: string | null;

  @ApiProperty({ example: '2026-04-16T00:00:00.000Z' })
  receivedAt!: Date;

  @ApiProperty({ example: '2026-04-16T15:00:00.000Z' })
  createdAt!: Date;
}

export class CreateOfferDto {
  @ApiProperty({ example: 'shop-id' })
  @IsString()
  shopId!: string;

  @ApiProperty({ example: 'category-id' })
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional({ example: 'brand-id', nullable: true })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ example: 'distribution-node-id' })
  @IsOptional()
  @IsString()
  distributionNodeId?: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Mo ta san pham' })
  @IsString()
  @MinLength(3)
  description!: string;

  @ApiProperty({ example: 150000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiPropertyOptional({ example: 'VND' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ enum: OFFER_SALES_MODES, example: 'WHOLESALE' })
  @IsOptional()
  @IsString()
  @IsIn(OFFER_SALES_MODES)
  salesMode?: 'RETAIL' | 'WHOLESALE' | 'BOTH';

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minWholesaleQty?: number;

  @ApiPropertyOptional({ example: 'new' })
  @IsOptional()
  @IsString()
  itemCondition?: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  availableQuantity!: number;

  @ApiPropertyOptional({ enum: OFFER_STATUSES, example: 'draft' })
  @IsOptional()
  @IsString()
  @IsIn(OFFER_STATUSES)
  offerStatus?: 'active' | 'inactive' | 'draft';

  @ApiPropertyOptional({ example: 'standard' })
  @IsOptional()
  @IsString()
  verificationLevel?: string;

  @ApiPropertyOptional({ example: ['SELF_DELIVERY', 'GHN'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shippingProviderCodes?: string[];

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcelWeightGrams?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcelLengthCm?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcelWidthCm?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcelHeightCm?: number;
}

export class UpdateOfferDto {
  @ApiPropertyOptional({ example: 'Kem chong nang SPF50 - lo 2026' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Mo ta san pham' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  availableQuantity?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcelWeightGrams?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcelLengthCm?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcelWidthCm?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcelHeightCm?: number;

  @ApiPropertyOptional({ enum: OFFER_STATUSES, example: 'active' })
  @IsOptional()
  @IsString()
  @IsIn(OFFER_STATUSES)
  offerStatus?: 'active' | 'inactive' | 'draft';

  @ApiPropertyOptional({ example: ['SELF_DELIVERY', 'GHN'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shippingProviderCodes?: string[];
}

export class ListOffersQueryDto {
  @ApiPropertyOptional({
    description: 'Optional. Leave empty to list offers from all shops.',
    example: 'shop-id',
  })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({
    description: 'Optional keyword. Leave empty to disable text search.',
    example: 'kem chong nang',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description:
      'Optional category filter. Leave empty to include all categories.',
    example: 'category-id',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Optional brand filter. Leave empty to include all brands.',
    example: 'brand-id',
  })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({
    description: 'Optional minimum price.',
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Optional maximum price.',
    example: 500000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description:
      'Optional origin/location filter. Leave empty to include all locations.',
    example: 'VN',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description:
      'Optional verification level filter. Leave empty to include all levels.',
    example: 'standard',
  })
  @IsOptional()
  @IsString()
  verificationStatus?: string;

  @ApiPropertyOptional({
    description:
      'Optional shop type filter. Leave empty to include all shop types.',
    enum: SHOP_TYPES,
  })
  @IsOptional()
  @IsIn(SHOP_TYPES)
  shopType?: (typeof SHOP_TYPES)[number];

  @ApiPropertyOptional({
    description:
      'Optional sales channel filter. Leave empty or use all to include every sales mode.',
    enum: OFFER_SALES_CHANNELS,
    example: 'all',
  })
  @IsOptional()
  @IsIn(OFFER_SALES_CHANNELS)
  salesChannel?: (typeof OFFER_SALES_CHANNELS)[number];

  @ApiPropertyOptional({
    description:
      'Optional sort order. Leave empty for featured/default ordering.',
    enum: OFFER_SORTS,
    example: 'featured',
  })
  @IsOptional()
  @IsIn(OFFER_SORTS)
  sort?: (typeof OFFER_SORTS)[number];

  @ApiPropertyOptional({
    description: '1-based page number.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page. Maximum 100.',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
