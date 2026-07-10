import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';

const OFFER_STATUSES = ['active', 'inactive', 'draft'] as const;
const MODERATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'banned',
] as const;
const SHOP_TYPES = [
  'NORMAL',
  'HANDMADE',
  'MANUFACTURER',
  'DISTRIBUTOR',
] as const;
const OFFER_SORTS = ['featured', 'newest', 'price-asc', 'price-desc'] as const;

export class CreateOfferOptionValueDto {
  @ApiProperty({ example: 'Do' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  text!: string;

  @ApiPropertyOptional({ example: 'media-asset-id', nullable: true })
  @IsOptional()
  @IsString()
  mediaAssetId?: string | null;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateOfferOptionGroupDto {
  @ApiProperty({ example: 'Mau sac' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName!: string;

  @ApiProperty({ type: () => [CreateOfferOptionValueDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOfferOptionValueDto)
  values!: CreateOfferOptionValueDto[];
}

export class OfferOptionMediaAssetResponseDto {
  @ApiProperty({ example: 'media-asset-id' })
  id!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/red.jpg',
  })
  secureUrl!: string;
}

export class OfferOptionValueResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
  @ApiPropertyOptional({
    type: OfferOptionMediaAssetResponseDto,
    nullable: true,
  })
  mediaAsset!: OfferOptionMediaAssetResponseDto | null;
}

export class OfferOptionGroupResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ type: [OfferOptionValueResponseDto] })
  values!: OfferOptionValueResponseDto[];
}

export class OfferDetailVariantResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) sku!: string | null;
  @ApiPropertyOptional({ nullable: true }) price!: number | null;
  @ApiProperty() availableQuantity!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [String] }) optionValueIds!: string[];
  @ApiPropertyOptional({
    type: OfferOptionMediaAssetResponseDto,
    nullable: true,
  })
  mediaAsset!: OfferOptionMediaAssetResponseDto | null;
}

export class OfferVariantOptionGroupResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() displayName!: string;
}

export class OfferVariantOptionValueResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
  @ApiProperty({ type: OfferVariantOptionGroupResponseDto })
  optionGroup!: OfferVariantOptionGroupResponseDto;
}

export class OfferVariantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() offerId!: string;
  @ApiPropertyOptional({ nullable: true }) sku!: string | null;
  @ApiPropertyOptional({ nullable: true }) priceOverride!: number | null;
  @ApiProperty() availableQuantity!: number;
  @ApiPropertyOptional({
    type: OfferOptionMediaAssetResponseDto,
    nullable: true,
  })
  mediaAsset!: OfferOptionMediaAssetResponseDto | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [OfferVariantOptionValueResponseDto] })
  optionValues!: OfferVariantOptionValueResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class CreateOfferVariantDto {
  @ApiPropertyOptional({ example: 'RED-M', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string | null;

  @ApiPropertyOptional({ example: 120000, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  priceOverride?: number | null;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  availableQuantity!: number;

  @ApiPropertyOptional({ example: 'media-asset-id', nullable: true })
  @IsOptional()
  @IsString()
  mediaAssetId?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: ['red-option-value-id', 'medium-option-value-id'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  optionValueIds!: string[];
}

export class BuyNowOfferPreviewQueryDto {
  @ApiProperty({ example: '06b5f15b-4c48-4f57-a2d6-0f2eb45fd001' })
  @IsUUID('4')
  offerId!: string;

  @ApiPropertyOptional({
    example: '6faacfa4-e09f-4ed2-bd74-a05c538f988d',
    nullable: true,
  })
  @Transform(({ value }) =>
    value === undefined || value === '' || value === 'null' ? null : value,
  )
  @IsOptional()
  @IsUUID('4')
  variantId?: string | null;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class BuyNowOfferPreviewResponseDto {
  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'Shop Chinh Hang' })
  shopName!: string;

  @ApiProperty({ example: '06b5f15b-4c48-4f57-a2d6-0f2eb45fd001' })
  offerId!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50' })
  modelName!: string;

  @ApiPropertyOptional({
    example: '6faacfa4-e09f-4ed2-bd74-a05c538f988d',
    nullable: true,
  })
  variantId!: string | null;

  @ApiPropertyOptional({ example: 'RED-M', nullable: true })
  sku!: string | null;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 150000 })
  price!: number;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
    nullable: true,
  })
  thumbnailUrl!: string | null;

  @ApiProperty({ type: () => [BuyNowShippingOptionResponseDto] })
  shippingOptions!: BuyNowShippingOptionResponseDto[];
}

export class BuyNowShippingOptionResponseDto {
  @ApiProperty({ example: 'GHN_1' }) optionCode!: string;
  @ApiProperty({ example: 'GHN' }) providerCode!: string;
  @ApiProperty({ example: 'Giao Hang Nhanh' }) providerName!: string;
  @ApiProperty({ example: 'Giao hang tieu chuan' }) methodName!: string;
  @ApiProperty({ example: 30000 }) shippingFee!: number;
  @ApiPropertyOptional({ example: '2-3 days', nullable: true }) estimatedDelivery!: string | null;
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

  @ApiProperty({ example: 'active' })
  offerStatus!: string;

  @ApiProperty({ enum: MODERATION_STATUSES, example: 'approved' })
  moderationStatus!: (typeof MODERATION_STATUSES)[number];

  @ApiProperty({ type: [OfferOptionGroupResponseDto] })
  optionGroups!: OfferOptionGroupResponseDto[];

  @ApiProperty({ type: [OfferDetailVariantResponseDto] })
  variants!: OfferDetailVariantResponseDto[];

  @ApiPropertyOptional({
    example: 'Thong tin san pham khong hop le',
    nullable: true,
  })
  moderationReason!: string | null;

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

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class ModerateOfferDto {
  @ApiProperty({ enum: MODERATION_STATUSES, example: 'approved' })
  @IsString()
  @IsIn(MODERATION_STATUSES)
  moderationStatus!: (typeof MODERATION_STATUSES)[number];

  @ApiPropertyOptional({
    example: 'Thong tin san pham khong hop le',
    nullable: true,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  moderationReason!: string | null;
}

export class AdminOfferListQueryDto {
  @ApiPropertyOptional({
    enum: OFFER_STATUSES,
    example: 'inactive',
    description:
      'Trạng thái bán do seller điều khiển: active = đang mở bán; inactive = tạm ngừng bán; draft = bản nháp chưa gửi bán. Bỏ trống để lấy tất cả.',
  })
  @IsOptional()
  @IsString()
  @IsIn(OFFER_STATUSES)
  offerStatus?: 'active' | 'inactive' | 'draft';

  @ApiPropertyOptional({
    enum: MODERATION_STATUSES,
    example: 'pending',
    description:
      'Trạng thái kiểm duyệt do admin/hệ thống điều khiển: pending = chờ duyệt; approved = đã duyệt; rejected = bị từ chối, có thể chỉnh sửa để gửi lại; banned = bị cấm, không được phép mở bán. Bỏ trống để lấy tất cả.',
  })
  @IsOptional()
  @IsString()
  @IsIn(MODERATION_STATUSES)
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'banned';

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class AdminOfferRelationResponseDto {
  @ApiProperty({ example: 'shop_001' })
  id!: string;

  @ApiProperty({ example: 'Shop Chinh Hang' })
  name!: string;
}

export class AdminOfferListItemResponseDto {
  @ApiProperty({ example: 'offer_001' }) id!: string;
  @ApiProperty({ example: 'Kem chong nang SPF50' }) title!: string;
  @ApiPropertyOptional({
    example: 'https://example.com/image.jpg',
    nullable: true,
  })
  thumbnail!: string | null;
  @ApiProperty({ example: 150000 }) price!: number;
  @ApiProperty({ example: 'VND' }) currency!: string;
  @ApiProperty({ type: AdminOfferRelationResponseDto })
  shop!: AdminOfferRelationResponseDto;
  @ApiProperty({ type: AdminOfferRelationResponseDto })
  category!: AdminOfferRelationResponseDto;
  @ApiProperty({ example: 'inactive' }) offerStatus!: string;
  @ApiProperty({ example: 'pending' }) moderationStatus!: string;
  @ApiProperty({ example: '2026-07-03T08:30:00.000Z' }) createdAt!: Date;
}

export class PaginatedAdminOfferListResponseDto {
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 10 }) pageSize!: number;
  @ApiProperty({ example: 2 }) totalItems!: number;
  @ApiProperty({ example: 1 }) totalPages!: number;
  @ApiProperty({ type: AdminOfferListItemResponseDto, isArray: true })
  items!: AdminOfferListItemResponseDto[];
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

  @ApiProperty({ type: [OfferOptionGroupResponseDto] })
  optionGroups!: OfferOptionGroupResponseDto[];

  @ApiProperty({ type: [OfferDetailVariantResponseDto] })
  variants!: OfferDetailVariantResponseDto[];

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

  @ApiProperty({ example: 500 })
  availableQuantity!: number;

  @ApiProperty({ example: 120 })
  soldQuantity!: number;

  @ApiProperty({ example: 'active' })
  offerStatus!: string;

  @ApiProperty({ enum: MODERATION_STATUSES, example: 'approved' })
  moderationStatus!: string;

  @ApiPropertyOptional({
    example: 'Thong tin san pham khong hop le',
    nullable: true,
  })
  moderationReason!: string | null;

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
  @ApiPropertyOptional({ enum: OFFER_STATUSES })
  @IsOptional()
  @IsIn(OFFER_STATUSES)
  offerStatus?: (typeof OFFER_STATUSES)[number];

  @ApiPropertyOptional({ enum: MODERATION_STATUSES })
  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  moderationStatus?: (typeof MODERATION_STATUSES)[number];

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
  @ApiProperty({ example: 'category-id' })
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional({
    example: 'brand-id',
    description:
      'Existing brand ID selected by the seller. Takes precedence over brandName.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  brandId?: string;

  @ApiPropertyOptional({
    example: 'Nike',
    description:
      'Seller-entered brand name used only when brandId is not provided.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  brandName?: string;

  @ApiProperty({ example: 'Kem chong nang SPF50 - lo 2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Mo ta san pham' })
  @IsString()
  @MinLength(3)
  description!: string;

  @ApiProperty({
    example: ['image1', 'image2', 'image3', 'image4'],
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  productImages!: string[];

  @ApiProperty({ example: 150000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({ enum: ['VND'], example: 'VND' })
  @IsString()
  @IsIn(['VND'])
  @MaxLength(10)
  currency!: 'VND';

  @ApiProperty({ enum: ['new', 'used'], example: 'new' })
  @IsString()
  @IsIn(['new', 'used'])
  itemCondition!: 'new' | 'used';

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  availableQuantity!: number;

  @ApiProperty({ example: '8930000000141' })
  @IsString()
  gtin!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  model!: string;

  @ApiProperty({ example: 450 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weightGrams!: number;

  @ApiProperty({ example: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lengthCm!: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  widthCm!: number;

  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  heightCm!: number;

  @ApiPropertyOptional({ type: () => [CreateOfferOptionGroupDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOfferOptionGroupDto)
  optionGroups?: CreateOfferOptionGroupDto[];
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
      'Optional shop type filter. Leave empty to include all shop types.',
    enum: SHOP_TYPES,
  })
  @IsOptional()
  @IsIn(SHOP_TYPES)
  shopType?: (typeof SHOP_TYPES)[number];

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
