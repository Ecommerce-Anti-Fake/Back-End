import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const REVIEW_MEDIA_ASSET_TYPES = ['IMAGE'] as const;

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
  @ApiProperty({
    example:
      'https://res.cloudinary.com/example/image/upload/v1/reviews/review-1/media/photo.jpg',
  })
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
  @ApiProperty({ example: 'review-media-1' }) id!: string;
  @ApiProperty({ example: 'review-id' }) reviewId!: string;
  @ApiPropertyOptional({ example: 'media-asset-1', nullable: true })
  mediaAssetId!: string | null;
  @ApiProperty({
    example:
      'https://res.cloudinary.com/example/image/upload/v1/reviews/review-1/media/photo.jpg',
  })
  fileUrl!: string;
  @ApiProperty({ example: 'IMAGE' }) assetType!: 'IMAGE' | 'VIDEO' | 'RAW';
  @ApiPropertyOptional({ example: 'image/jpeg', nullable: true }) mimeType!:
    | string
    | null;
  @ApiPropertyOptional({
    example: 'reviews/review-1/media/photo',
    nullable: true,
  })
  publicId!: string | null;
  @ApiProperty({ example: '2026-05-15T10:00:00.000Z' }) createdAt!: Date;
}

export class OfferReviewResponseDto {
  @ApiProperty({ example: 'review-id' }) id!: string;
  @ApiProperty({ example: 'order-id' }) orderId!: string;
  @ApiPropertyOptional({ example: 'order-item-id', nullable: true })
  orderItemId!: string | null;
  @ApiPropertyOptional({ example: 'offer-id', nullable: true }) offerId!:
    | string
    | null;
  @ApiProperty({ example: 5 }) rating!: number;
  @ApiPropertyOptional({ example: 'San pham dung mo ta.', nullable: true })
  comment!: string | null;
  @ApiProperty({ example: 'Nguoi mua da xac minh' }) authorName!: string;
  @ApiProperty({ example: true }) verifiedPurchase!: boolean;
  @ApiProperty({ example: true }) hasImage!: boolean;
  @ApiProperty({ type: ReviewMediaResponseDto, isArray: true })
  media!: ReviewMediaResponseDto[];
  @ApiProperty({ example: '2026-05-14T10:00:00.000Z' }) createdAt!: Date;
}

export class OfferReviewListMediaResponseDto {
  @ApiProperty({
    example:
      'https://res.cloudinary.com/example/image/upload/v1/reviews/review-1/media/photo.jpg',
  })
  fileUrl!: string;
}

export class OfferReviewListItemResponseDto {
  @ApiProperty({ example: 'review-id' }) id!: string;
  @ApiProperty({ example: 5 }) rating!: number;
  @ApiPropertyOptional({ example: 'San pham dung mo ta.', nullable: true })
  comment!: string | null;
  @ApiProperty({ example: 'Nguoi mua da xac minh' }) authorName!: string;
  @ApiProperty({ type: OfferReviewListMediaResponseDto, isArray: true })
  media!: OfferReviewListMediaResponseDto[];
  @ApiProperty({ example: '2026-05-14T10:00:00.000Z' }) createdAt!: string;
}

export class OfferReviewsResponseDto {
  @ApiProperty({ example: 2 }) total!: number;
  @ApiProperty({ example: 4.5 }) averageRating!: number;
  @ApiProperty({ type: OfferReviewListItemResponseDto, isArray: true })
  items!: OfferReviewListItemResponseDto[];
}
