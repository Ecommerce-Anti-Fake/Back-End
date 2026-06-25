import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const SOCIAL_POST_TYPES = ['SHARE', 'QUESTION', 'PRODUCT_SHARE'] as const;
const SOCIAL_POST_VISIBILITIES = ['PUBLIC', 'HIDDEN'] as const;
const SOCIAL_REACTION_TYPES = ['LIKE'] as const;

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
  @ApiProperty() id!: string;
  @ApiProperty() postId!: string;
  @ApiProperty() authorUserId!: string;
  @ApiProperty() authorName!: string;
  @ApiProperty() body!: string;
  @ApiProperty() visibility!: string;
  @ApiProperty() createdAt!: Date;
}

export class SocialPostAuthorResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() avatar?: string | null;
  @ApiPropertyOptional() shopName?: string | null;
}

export class SocialPostStatsResponseDto {
  @ApiProperty() reactions!: number;
  @ApiProperty() comments!: number;
  @ApiProperty() shares!: number;
}

export class SocialPostViewerResponseDto {
  @ApiProperty() liked!: boolean;
}

export class SocialPostResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: SocialPostAuthorResponseDto })
  author!: SocialPostAuthorResponseDto;
  @ApiProperty({ enum: SOCIAL_POST_TYPES }) postType!: string;
  @ApiProperty() body!: string;
  @ApiPropertyOptional() image?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: SocialPostStatsResponseDto })
  stats!: SocialPostStatsResponseDto;
  @ApiProperty({ type: SocialPostViewerResponseDto })
  viewer!: SocialPostViewerResponseDto;
}
