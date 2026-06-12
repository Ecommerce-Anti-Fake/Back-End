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
const SHOP_TYPES = ['NORMAL', 'HANDMADE', 'MANUFACTURER', 'DISTRIBUTOR'] as const;
const OFFER_SALES_CHANNELS = ['retail', 'wholesale', 'all'] as const;
const OFFER_SORTS = ['featured', 'newest', 'price-asc', 'price-desc'] as const;
const SOCIAL_POST_TYPES = ['SHARE', 'QUESTION', 'PRODUCT_SHARE'] as const;
const SOCIAL_POST_VISIBILITIES = ['PUBLIC', 'HIDDEN'] as const;
const SOCIAL_REACTION_TYPES = ['LIKE'] as const;
const LIVE_SESSION_STATUSES = ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'] as const;
const LIVE_SESSION_FILTERS = ['all', 'live', 'upcoming'] as const;

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

export class ShippingCarrierResponseDto {
  @ApiProperty({ example: 'GHN' })
  providerCode!: string;

  @ApiProperty({ example: 'Giao Hang Nhanh' })
  providerName!: string;

  @ApiProperty({ example: true })
  isIntegrated!: boolean;
}

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

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/product.jpg', nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ type: OfferShippingMethodResponseDto, isArray: true })
  shippingMethods!: OfferShippingMethodResponseDto[];

  @ApiProperty({ example: '2026-04-14T10:00:00.000Z' })
  createdAt!: Date;
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

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/product.jpg', nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ type: OfferShippingMethodResponseDto, isArray: true })
  shippingMethods!: OfferShippingMethodResponseDto[];

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

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/product.jpg', nullable: true })
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

export class ChatMessageResponseDto {
  @ApiProperty({ example: 'message-id' })
  id!: string;

  @ApiProperty({ example: 'thread-id' })
  threadId!: string;

  @ApiProperty({ example: 'user-id' })
  senderUserId!: string;

  @ApiPropertyOptional({ example: 'client-generated-message-id', nullable: true })
  clientMessageId!: string | null;

  @ApiProperty({ example: 'Nguyen Van A' })
  senderName!: string;

  @ApiProperty({ example: 'TEXT' })
  messageType!: string;

  @ApiProperty({ example: 'Shop tu van giup minh san pham nay.' })
  body!: string;

  @ApiProperty({ example: '2026-05-26T10:00:00.000Z' })
  sentAt!: Date;
}

export class ChatThreadResponseDto {
  @ApiProperty({ example: 'thread-id' })
  id!: string;

  @ApiProperty({ example: 'shop-id' })
  shopId!: string;

  @ApiProperty({ example: 'Shop AntiFake' })
  shopName!: string;

  @ApiProperty({ example: 'buyer-user-id' })
  buyerUserId!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  buyerName!: string;

  @ApiProperty({ example: 'seller-user-id' })
  sellerUserId!: string;

  @ApiProperty({ example: 'Shop Owner' })
  sellerName!: string;

  @ApiPropertyOptional({ type: ChatMessageResponseDto })
  lastMessage!: ChatMessageResponseDto | null;

  @ApiProperty({ type: ChatMessageResponseDto, isArray: true })
  messages!: ChatMessageResponseDto[];

  @ApiProperty({ example: '2026-05-26T10:00:00.000Z' })
  createdAt!: Date;
}

export class StartChatThreadDto {
  @ApiPropertyOptional({ example: 'Shop tu van giup minh san pham nay.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  initialMessage?: string;
}

export class SendChatMessageDto {
  @ApiProperty({ example: 'Minh can them thong tin xac thuc.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;

  @ApiPropertyOptional({ example: 'client-generated-message-id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientMessageId?: string;
}

export class ListSocialPostsQueryDto {
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
  pageSize?: number;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  includeHidden?: string;
}

export class CreateSocialPostDto {
  @ApiProperty({ enum: SOCIAL_POST_TYPES, example: 'QUESTION' })
  @IsIn(SOCIAL_POST_TYPES)
  postType!: (typeof SOCIAL_POST_TYPES)[number];

  @ApiProperty({ example: 'Lam sao de kiem tra san pham nay chinh hang?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;

  @ApiPropertyOptional({ example: 'shop-id' })
  @IsOptional()
  @IsString()
  authorShopId?: string | null;

  @ApiPropertyOptional({ example: 'offer-id' })
  @IsOptional()
  @IsString()
  offerId?: string | null;
}

export class CreateSocialCommentDto {
  @ApiProperty({ example: 'Minh da mua va thay tem QR hop le.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

export class SetSocialReactionDto {
  @ApiPropertyOptional({ enum: SOCIAL_REACTION_TYPES, example: 'LIKE' })
  @IsOptional()
  @IsIn(SOCIAL_REACTION_TYPES)
  reactionType?: (typeof SOCIAL_REACTION_TYPES)[number];
}

export class UpdateSocialPostVisibilityDto {
  @ApiProperty({ enum: SOCIAL_POST_VISIBILITIES, example: 'HIDDEN' })
  @IsIn(SOCIAL_POST_VISIBILITIES)
  visibility!: (typeof SOCIAL_POST_VISIBILITIES)[number];
}

export class SocialCommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  postId!: string;

  @ApiProperty()
  authorUserId!: string;

  @ApiProperty()
  authorName!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  visibility!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class SocialPostResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  authorUserId!: string;

  @ApiPropertyOptional()
  authorShopId?: string | null;

  @ApiProperty()
  authorName!: string;

  @ApiPropertyOptional()
  authorShopName?: string | null;

  @ApiPropertyOptional()
  offerId?: string | null;

  @ApiProperty({ enum: SOCIAL_POST_TYPES })
  postType!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  visibility!: string;

  @ApiProperty()
  reactionCount!: number;

  @ApiProperty()
  commentCount!: number;

  @ApiProperty()
  shareCount!: number;

  @ApiProperty()
  viewerHasLiked!: boolean;

  @ApiProperty({ type: SocialCommentResponseDto, isArray: true })
  comments!: SocialCommentResponseDto[];

  @ApiProperty()
  createdAt!: Date;
}

export class ListLiveSessionsQueryDto {
  @ApiPropertyOptional({ enum: LIVE_SESSION_FILTERS, example: 'all' })
  @IsOptional()
  @IsIn(LIVE_SESSION_FILTERS)
  filter?: (typeof LIVE_SESSION_FILTERS)[number];

  @ApiPropertyOptional({ example: 'deal chinh hang' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateLiveSessionDto {
  @ApiProperty({ example: 'shop-id' })
  @IsString()
  shopId!: string;

  @ApiProperty({ example: 'Live sale hang chinh hang' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ example: 'Gioi thieu san pham co QR xac thuc.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/live-cover.jpg' })
  @IsOptional()
  @IsString()
  coverUrl?: string | null;

  @ApiProperty({ example: '2026-06-02T13:00:00.000Z' })
  @IsString()
  startAt!: string;

  @ApiPropertyOptional({ example: 'https://video.example.com/embed/live-1' })
  @IsOptional()
  @IsString()
  playbackUrl?: string | null;

  @ApiPropertyOptional({ example: 'HLS_CDN' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  streamProvider?: string | null;

  @ApiPropertyOptional({ example: 'provider-session-id' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  streamProviderSessionId?: string | null;

  @ApiPropertyOptional({ example: 'rtmp://ingest.example.com/live/stream-key' })
  @IsOptional()
  @IsString()
  streamIngestUrl?: string | null;

  @ApiPropertyOptional({ example: 8000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  streamLatencyTargetMs?: number | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/recordings/live-1.m3u8' })
  @IsOptional()
  @IsString()
  recordingUrl?: string | null;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  recordingRetentionDays?: number | null;

  @ApiPropertyOptional({ example: ['offer-id-1', 'offer-id-2'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offerIds?: string[];
}

export class UpdateLiveSessionStatusDto {
  @ApiProperty({ enum: LIVE_SESSION_STATUSES, example: 'LIVE' })
  @IsIn(LIVE_SESSION_STATUSES)
  status!: (typeof LIVE_SESSION_STATUSES)[number];
}

export class ListLiveCommentsQueryDto {
  @ApiPropertyOptional({ example: 'comment-id' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ example: '2026-06-05T03:00:00.000Z' })
  @IsOptional()
  @IsString()
  since?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;

  @ApiPropertyOptional({ example: 'false' })
  @IsOptional()
  @IsString()
  includeHidden?: string;
}

export class CreateLiveCommentDto {
  @ApiProperty({ example: 'Shop oi san pham nay con size M khong?' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;

  @ApiPropertyOptional({ example: 'client-message-id' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientMessageId?: string | null;
}

export class UpdateLiveCommentVisibilityDto {
  @ApiProperty({ enum: SOCIAL_POST_VISIBILITIES, example: 'HIDDEN' })
  @IsIn(SOCIAL_POST_VISIBILITIES)
  visibility!: (typeof SOCIAL_POST_VISIBILITIES)[number];
}

export class LiveSessionOfferResponseDto {
  @ApiProperty()
  offerId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  availableQuantity!: number;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;
}

export class LiveCommentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  authorUserId!: string;

  @ApiProperty()
  authorName!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: SOCIAL_POST_VISIBILITIES })
  visibility!: (typeof SOCIAL_POST_VISIBILITIES)[number];

  @ApiPropertyOptional()
  clientMessageId?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class LiveSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  shopId!: string;

  @ApiProperty()
  shopName!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  coverUrl?: string | null;

  @ApiProperty()
  startAt!: Date;

  @ApiProperty({ enum: LIVE_SESSION_STATUSES })
  status!: string;

  @ApiPropertyOptional()
  playbackUrl?: string | null;

  @ApiPropertyOptional()
  streamProvider?: string | null;

  @ApiPropertyOptional()
  streamProviderSessionId?: string | null;

  @ApiPropertyOptional()
  streamIngestUrl?: string | null;

  @ApiPropertyOptional()
  streamLatencyTargetMs?: number | null;

  @ApiPropertyOptional()
  recordingUrl?: string | null;

  @ApiPropertyOptional()
  recordingRetentionDays?: number | null;

  @ApiProperty()
  reminderCount!: number;

  @ApiProperty()
  viewerHasReminder!: boolean;

  @ApiProperty({ type: LiveSessionOfferResponseDto, isArray: true })
  offers!: LiveSessionOfferResponseDto[];

  @ApiProperty()
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
    description: 'Optional category filter. Leave empty to include all categories.',
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
    description: 'Optional origin/location filter. Leave empty to include all locations.',
    example: 'VN',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Optional verification level filter. Leave empty to include all levels.',
    example: 'standard',
  })
  @IsOptional()
  @IsString()
  verificationStatus?: string;

  @ApiPropertyOptional({
    description: 'Optional shop type filter. Leave empty to include all shop types.',
    enum: SHOP_TYPES,
  })
  @IsOptional()
  @IsIn(SHOP_TYPES)
  shopType?: (typeof SHOP_TYPES)[number];

  @ApiPropertyOptional({
    description: 'Optional sales channel filter. Leave empty or use all to include every sales mode.',
    enum: OFFER_SALES_CHANNELS,
    example: 'all',
  })
  @IsOptional()
  @IsIn(OFFER_SALES_CHANNELS)
  salesChannel?: (typeof OFFER_SALES_CHANNELS)[number];

  @ApiPropertyOptional({
    description: 'Optional sort order. Leave empty for featured/default ordering.',
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
