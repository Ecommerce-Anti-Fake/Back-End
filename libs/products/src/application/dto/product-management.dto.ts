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

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  shopName!: string;

  @ApiProperty({ example: 'My pham' })
  categoryName!: string;

  @ApiProperty({ example: 'Kem chong nang SPF50' })
  productModelName!: string;

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

  @ApiPropertyOptional({ example: 'standard' })
  @IsOptional()
  @IsString()
  verificationLevel?: string;
}

export class ListOffersQueryDto {
  @ApiPropertyOptional({ example: 'shop-id' })
  @IsOptional()
  @IsString()
  shopId?: string;
}
