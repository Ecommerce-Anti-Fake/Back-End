import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const LIVE_SESSION_STATUSES = [
  'SCHEDULED',
  'LIVE',
  'ENDED',
  'CANCELLED',
] as const;
const LIVE_SESSION_FILTERS = ['all', 'live', 'upcoming'] as const;
const CONTENT_VISIBILITIES = ['PUBLIC', 'HIDDEN'] as const;

export class ListLiveSessionsQueryDto {
  @ApiPropertyOptional({ enum: LIVE_SESSION_FILTERS, example: 'all' })
  @IsOptional()
  @IsIn(LIVE_SESSION_FILTERS)
  filter?: (typeof LIVE_SESSION_FILTERS)[number];

  @ApiPropertyOptional({ example: 'deal chinh hang' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'shop-id' })
  @IsOptional()
  @IsString()
  shopId?: string;
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

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/recordings/live-1.m3u8',
  })
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

  @ApiPropertyOptional({
    example: ['voucher-id-1'],
    isArray: true,
    description: 'Active shop vouchers valid when the livestream starts.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  voucherIds?: string[];
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
  @ApiProperty({ enum: CONTENT_VISIBILITIES, example: 'HIDDEN' })
  @IsIn(CONTENT_VISIBILITIES)
  visibility!: (typeof CONTENT_VISIBILITIES)[number];
}

export class LiveSessionOfferResponseDto {
  @ApiProperty() offerId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() price!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() availableQuantity!: number;
  @ApiPropertyOptional() thumbnailUrl?: string | null;
}

export class LiveSessionVoucherResponseDto {
  @ApiProperty() voucherId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() discountType!: string;
  @ApiPropertyOptional() percentage?: number | null;
  @ApiPropertyOptional() fixedAmount?: number | null;
  @ApiPropertyOptional() maxDiscountAmount?: number | null;
  @ApiProperty() minOrderAmount!: number;
  @ApiProperty() startsAt!: Date;
  @ApiProperty() endsAt!: Date;
}

export class LiveCommentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() sessionId!: string;
  @ApiProperty() authorUserId!: string;
  @ApiProperty() authorName!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ enum: CONTENT_VISIBILITIES })
  visibility!: (typeof CONTENT_VISIBILITIES)[number];
  @ApiPropertyOptional() clientMessageId?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class LiveSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() shopId!: string;
  @ApiProperty() shopName!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiPropertyOptional() coverUrl?: string | null;
  @ApiProperty() startAt!: Date;
  @ApiProperty({ enum: LIVE_SESSION_STATUSES }) status!: string;
  @ApiPropertyOptional() playbackUrl?: string | null;
  @ApiPropertyOptional() streamProvider?: string | null;
  @ApiPropertyOptional() streamLatencyTargetMs?: number | null;
  @ApiPropertyOptional() providerStatus?: string | null;
  @ApiPropertyOptional() actualStartedAt?: Date | null;
  @ApiPropertyOptional() actualEndedAt?: Date | null;
  @ApiPropertyOptional() recordingUrl?: string | null;
  @ApiPropertyOptional() recordingRetentionDays?: number | null;
  @ApiProperty() reminderCount!: number;
  @ApiProperty() viewerHasReminder!: boolean;
  @ApiProperty({ type: LiveSessionOfferResponseDto, isArray: true })
  offers!: LiveSessionOfferResponseDto[];
  @ApiProperty({ type: LiveSessionVoucherResponseDto, isArray: true })
  vouchers!: LiveSessionVoucherResponseDto[];
  @ApiProperty() createdAt!: Date;
}
