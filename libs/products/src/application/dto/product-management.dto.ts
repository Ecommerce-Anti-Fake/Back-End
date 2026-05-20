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
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const OFFER_SALES_MODES = ['RETAIL', 'WHOLESALE', 'BOTH'] as const;
const OFFER_MEDIA_ASSET_TYPES = ['IMAGE', 'VIDEO'] as const;
const REVIEW_MEDIA_ASSET_TYPES = ['IMAGE'] as const;
const OFFER_STATUSES = ['active', 'inactive', 'draft'] as const;

export class CreateBrandDto {
  @ApiProperty({ example: 'Brand ABC' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'verified' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registryStatus?: string;
}

export class BrandResponseDto {
  @ApiProperty({ example: 'brand-id' })
  id!: string;

  @ApiProperty({ example: 'Brand ABC' })
  name!: string;

  @ApiProperty({ example: 'verified' })
  registryStatus!: string;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'My pham' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'parent-category-id', nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 'medium' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  riskTier?: string;
}

export class CategoryResponseDto {
  @ApiProperty({ example: 'category-id' })
  id!: string;

  @ApiPropertyOptional({ example: 'parent-category-id', nullable: true })
  parentId!: string | null;

  @ApiProperty({ example: 'My pham' })
  name!: string;

  @ApiProperty({ example: 'medium' })
  riskTier!: string;
}

export class CreateProductModelDto {
  @ApiProperty({ example: 'brand-id' })
  @IsString()
  brandId!: string;

  @ApiProperty({ example: 'category-id' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  modelName!: string;

  @ApiPropertyOptional({ example: '8938505970012', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  gtin?: string;

  @ApiPropertyOptional({ example: 'manual_review' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  verificationPolicy?: string;

  @ApiPropertyOptional({ example: 'approved' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  approvalStatus?: string;
}

export class ProductModelResponseDto {
  @ApiProperty({ example: '86a353f0-7a6f-4c75-a7e5-c26d6472a001' })
  id!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50' })
  modelName!: string;

  @ApiPropertyOptional({ example: '8938505970012', nullable: true })
  gtin!: string | null;

  @ApiProperty({ example: 'manual_review' })
  verificationPolicy!: string;

  @ApiProperty({ example: 'approved' })
  approvalStatus!: string;

  @ApiProperty({ example: 'Brand ABC' })
  brandName!: string;

  @ApiProperty({ example: 'category-id' })
  categoryId!: string;

  @ApiProperty({ example: 'My pham' })
  categoryName!: string;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
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

  @ApiProperty({ example: 'standard' })
  verificationLevel!: string;

  @ApiProperty({ example: 'active' })
  offerStatus!: string;

  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'category-id' })
  categoryId!: string;

  @ApiProperty({ example: 'product-model-id' })
  productModelId!: string;

  @ApiPropertyOptional({ example: 'seller-node-id', nullable: true })
  distributionNodeId!: string | null;

  @ApiPropertyOptional({ example: 'network-id', nullable: true })
  distributionNetworkId!: string | null;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  shopName!: string;

  @ApiProperty({ example: 'My pham' })
  categoryName!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50' })
  productModelName!: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/product.jpg', nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class OfferMediaUploadSignatureItemDto {
  @ApiProperty({ enum: OFFER_MEDIA_ASSET_TYPES, example: 'IMAGE' })
  @IsString()
  @IsIn(OFFER_MEDIA_ASSET_TYPES)
  assetType!: 'IMAGE' | 'VIDEO';
}

export class GetOfferMediaUploadSignaturesDto {
  @ApiProperty({ type: OfferMediaUploadSignatureItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferMediaUploadSignatureItemDto)
  items!: OfferMediaUploadSignatureItemDto[];
}

export class OfferMediaUploadSignatureResponseDto {
  @ApiProperty({ example: 'dbpa0ndt0' })
  cloudName!: string;

  @ApiProperty({ example: '123456789012345' })
  apiKey!: string;

  @ApiProperty({ example: 1776240000 })
  timestamp!: number;

  @ApiProperty({ example: 'offers/offer-1/media' })
  folder!: string;

  @ApiProperty({ example: 'offers/offer-1/media/offer-1-1776240000-1' })
  publicId!: string;

  @ApiProperty({ example: 'image' })
  uploadResourceType!: 'image' | 'video';

  @ApiProperty({ example: 'abcdef1234567890' })
  signature!: string;
}

export class OfferMediaItemDto {
  @ApiProperty({ enum: OFFER_MEDIA_ASSET_TYPES, example: 'IMAGE' })
  @IsString()
  @IsIn(OFFER_MEDIA_ASSET_TYPES)
  assetType!: 'IMAGE' | 'VIDEO';

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/offers/offer-1/media/photo.jpg' })
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  fileUrl!: string;

  @ApiProperty({ example: 'offers/offer-1/media/photo' })
  @IsString()
  publicId!: string;

  @ApiPropertyOptional({ example: 'gallery' })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional({ example: 'a12b34c56d' })
  @IsOptional()
  @IsString()
  phash?: string;

  @ApiPropertyOptional({ example: 512000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bytes?: number;
}

export class AddOfferMediaBatchDto {
  @ApiProperty({ type: OfferMediaItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferMediaItemDto)
  items!: OfferMediaItemDto[];
}

export class OfferMediaResponseDto {
  @ApiProperty({ example: 'offer-media-1' })
  id!: string;

  @ApiProperty({ example: 'offer-1' })
  offerId!: string;

  @ApiPropertyOptional({ example: 'media-asset-1', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty({ example: 'gallery' })
  mediaType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/offers/offer-1/media/photo.jpg' })
  fileUrl!: string;

  @ApiPropertyOptional({ example: 'a12b34c56d', nullable: true })
  phash!: string | null;

  @ApiProperty({ example: 'IMAGE' })
  assetType!: 'IMAGE' | 'VIDEO' | 'RAW';

  @ApiPropertyOptional({ example: 'image/jpeg', nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ example: 'offers/offer-1/media/photo', nullable: true })
  publicId!: string | null;

  @ApiProperty({ example: '2026-04-16T13:00:00.000Z' })
  createdAt!: Date;
}

export class CreateOfferReviewDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rating!: number;

  @ApiPropertyOptional({ example: 'San pham dung mo ta, dong goi chac chan.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ReviewMediaUploadSignatureItemDto {
  @ApiProperty({ enum: REVIEW_MEDIA_ASSET_TYPES, example: 'IMAGE' })
  @IsString()
  @IsIn(REVIEW_MEDIA_ASSET_TYPES)
  assetType!: 'IMAGE';
}

export class GetReviewMediaUploadSignaturesDto {
  @ApiProperty({ type: ReviewMediaUploadSignatureItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewMediaUploadSignatureItemDto)
  items!: ReviewMediaUploadSignatureItemDto[];
}

export class ReviewMediaItemDto {
  @ApiProperty({ enum: REVIEW_MEDIA_ASSET_TYPES, example: 'IMAGE' })
  @IsString()
  @IsIn(REVIEW_MEDIA_ASSET_TYPES)
  assetType!: 'IMAGE';

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/reviews/review-1/media/photo.jpg' })
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  fileUrl!: string;

  @ApiProperty({ example: 'reviews/review-1/media/photo' })
  @IsString()
  publicId!: string;
}

export class AddReviewMediaBatchDto {
  @ApiProperty({ type: ReviewMediaItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewMediaItemDto)
  items!: ReviewMediaItemDto[];
}

export class ReviewMediaResponseDto {
  @ApiProperty({ example: 'review-media-1' })
  id!: string;

  @ApiProperty({ example: 'review-id' })
  reviewId!: string;

  @ApiPropertyOptional({ example: 'media-asset-1', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/reviews/review-1/media/photo.jpg' })
  fileUrl!: string;

  @ApiProperty({ example: 'IMAGE' })
  assetType!: 'IMAGE' | 'VIDEO' | 'RAW';

  @ApiPropertyOptional({ example: 'image/jpeg', nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ example: 'reviews/review-1/media/photo', nullable: true })
  publicId!: string | null;

  @ApiProperty({ example: '2026-05-15T10:00:00.000Z' })
  createdAt!: Date;
}

export class OfferReviewResponseDto {
  @ApiProperty({ example: 'review-id' })
  id!: string;

  @ApiProperty({ example: 'order-id' })
  orderId!: string;

  @ApiPropertyOptional({ example: 'order-item-id', nullable: true })
  orderItemId!: string | null;

  @ApiPropertyOptional({ example: 'offer-id', nullable: true })
  offerId!: string | null;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiPropertyOptional({ example: 'San pham dung mo ta.', nullable: true })
  comment!: string | null;

  @ApiProperty({ example: 'Nguoi mua da xac minh' })
  authorName!: string;

  @ApiProperty({ example: true })
  verifiedPurchase!: boolean;

  @ApiProperty({ example: true })
  hasImage!: boolean;

  @ApiProperty({ type: ReviewMediaResponseDto, isArray: true })
  media!: ReviewMediaResponseDto[];

  @ApiProperty({ example: '2026-05-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class OfferReviewsResponseDto {
  @ApiProperty({ example: 2 })
  total!: number;

  @ApiProperty({ example: 4.5 })
  averageRating!: number;

  @ApiProperty({ type: OfferReviewResponseDto, isArray: true })
  items!: OfferReviewResponseDto[];
}

export class OfferDocumentUploadSignatureItemDto {
  @ApiProperty({ example: 'INGREDIENT_CERTIFICATE' })
  @IsString()
  docType!: string;
}

export class GetOfferDocumentUploadSignaturesDto {
  @ApiProperty({ type: OfferDocumentUploadSignatureItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferDocumentUploadSignatureItemDto)
  items!: OfferDocumentUploadSignatureItemDto[];
}

export class OfferDocumentItemDto {
  @ApiProperty({ example: 'INGREDIENT_CERTIFICATE' })
  @IsString()
  docType!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/raw/upload/v1/offers/offer-1/documents/file.pdf' })
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  fileUrl!: string;

  @ApiProperty({ example: 'offers/offer-1/documents/file' })
  @IsString()
  publicId!: string;

  @ApiPropertyOptional({ example: 'Bo Y Te' })
  @IsOptional()
  @IsString()
  issuerName?: string;

  @ApiPropertyOptional({ example: 'GCN-001' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: 1048576 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bytes?: number;
}

export class AddOfferDocumentsBatchDto {
  @ApiProperty({ type: OfferDocumentItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferDocumentItemDto)
  items!: OfferDocumentItemDto[];
}

export class OfferDocumentResponseDto {
  @ApiProperty({ example: 'offer-doc-1' })
  id!: string;

  @ApiProperty({ example: 'offer-1' })
  offerId!: string;

  @ApiPropertyOptional({ example: 'media-asset-1', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty({ example: 'INGREDIENT_CERTIFICATE' })
  docType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/raw/upload/v1/offers/offer-1/documents/file.pdf' })
  fileUrl!: string;

  @ApiPropertyOptional({ example: 'Bo Y Te', nullable: true })
  issuerName!: string | null;

  @ApiProperty({ example: 'pending' })
  reviewStatus!: string;

  @ApiPropertyOptional({ example: 'application/pdf', nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ example: 'offers/offer-1/documents/file', nullable: true })
  publicId!: string | null;

  @ApiProperty({ example: '2026-04-16T13:00:00.000Z' })
  uploadedAt!: Date;
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

  @ApiProperty({ example: 'product-model-id' })
  productModelId!: string;

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

  @ApiProperty({ example: 'product-model-id' })
  @IsString()
  productModelId!: string;

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

  @ApiPropertyOptional({ enum: OFFER_STATUSES, example: 'active' })
  @IsOptional()
  @IsString()
  @IsIn(OFFER_STATUSES)
  offerStatus?: 'active' | 'inactive' | 'draft';
}

export class ListOffersQueryDto {
  @ApiPropertyOptional({ example: 'shop-id' })
  @IsOptional()
  @IsString()
  shopId?: string;
}
