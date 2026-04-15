import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const OFFER_SALES_MODES = ['RETAIL', 'WHOLESALE', 'BOTH'] as const;

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
