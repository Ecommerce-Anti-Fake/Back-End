import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';

const OFFER_MEDIA_ASSET_TYPES = ['IMAGE', 'VIDEO'] as const;

export class OfferMediaUploadSignatureItemDto {
  @ApiProperty({ enum: OFFER_MEDIA_ASSET_TYPES, example: 'IMAGE' })
  @IsString()
  @IsIn(OFFER_MEDIA_ASSET_TYPES)
  assetType!: 'IMAGE' | 'VIDEO';
}
export class GetOfferMediaUploadSignaturesDto {
  @ApiProperty({ type: OfferMediaUploadSignatureItemDto, isArray: true })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => OfferMediaUploadSignatureItemDto)
  items!: OfferMediaUploadSignatureItemDto[];
}
export class OfferMediaUploadSignatureResponseDto {
  @ApiProperty({ example: 'dbpa0ndt0' }) cloudName!: string;
  @ApiProperty({ example: '123456789012345' }) apiKey!: string;
  @ApiProperty({ example: 1776240000 }) timestamp!: number;
  @ApiProperty({ example: 'offers/offer-1/media' }) folder!: string;
  @ApiProperty({ example: 'offers/offer-1/media/offer-1-1776240000-1' })
  publicId!: string;
  @ApiProperty({ example: 'image' }) uploadResourceType!: 'image' | 'video';
  @ApiProperty({ example: 'abcdef1234567890' }) signature!: string;
}
export class OfferMediaItemDto {
  @ApiProperty({ enum: OFFER_MEDIA_ASSET_TYPES, example: 'IMAGE' })
  @IsString()
  @IsIn(OFFER_MEDIA_ASSET_TYPES)
  assetType!: 'IMAGE' | 'VIDEO';
  @ApiProperty({ example: 'image/jpeg' }) @IsString() mimeType!: string;
  @ApiProperty({
    example:
      'https://res.cloudinary.com/example/image/upload/v1/offers/offer-1/media/photo.jpg',
  })
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
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => OfferMediaItemDto)
  items!: OfferMediaItemDto[];
}
export class OfferMediaResponseDto {
  @ApiProperty({ example: 'offer-media-1' }) id!: string;
  @ApiProperty({ example: 'offer-1' }) offerId!: string;
  @ApiPropertyOptional({ example: 'media-asset-1', nullable: true })
  mediaAssetId!: string | null;
  @ApiProperty({ example: 'gallery' }) mediaType!: string;
  @ApiProperty() fileUrl!: string;
  @ApiPropertyOptional({ nullable: true }) phash!: string | null;
  @ApiProperty({ example: 'IMAGE' }) assetType!: 'IMAGE' | 'VIDEO' | 'RAW';
  @ApiPropertyOptional({ nullable: true }) mimeType!: string | null;
  @ApiPropertyOptional({ nullable: true }) publicId!: string | null;
  @ApiProperty() createdAt!: Date;
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
  @ApiProperty() @IsString() docType!: string;
  @ApiProperty() @IsString() mimeType!: string;
  @ApiProperty()
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  fileUrl!: string;
  @ApiProperty() @IsString() publicId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issuerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentNumber?: string;
  @ApiPropertyOptional()
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
  @ApiProperty() id!: string;
  @ApiProperty() offerId!: string;
  @ApiPropertyOptional({ nullable: true }) mediaAssetId!: string | null;
  @ApiProperty() docType!: string;
  @ApiProperty() fileUrl!: string;
  @ApiPropertyOptional({ nullable: true }) issuerName!: string | null;
  @ApiProperty() reviewStatus!: string;
  @ApiPropertyOptional({ nullable: true }) mimeType!: string | null;
  @ApiPropertyOptional({ nullable: true }) publicId!: string | null;
  @ApiProperty() uploadedAt!: Date;
}
