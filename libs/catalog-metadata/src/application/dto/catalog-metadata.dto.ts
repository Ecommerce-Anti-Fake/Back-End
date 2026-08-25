import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({
    example:
      'https://res.cloudinary.com/demo/image/upload/categories/my-pham.jpg',
    nullable: true,
  })
  imageUrl!: string | null;

  @ApiProperty({ example: 'medium' })
  riskTier!: string;
}

export class CategoryCommandResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Tạo danh mục thành công.' })
  message!: string;
}

export class ShippingCarrierResponseDto {
  @ApiProperty({ example: 'GHN' })
  providerCode!: string;

  @ApiProperty({ example: 'Giao Hang Nhanh' })
  providerName!: string;

  @ApiProperty({ example: true })
  isIntegrated!: boolean;
}

export class VerifyProductQueryDto {
  @ApiProperty({
    description:
      'Product verification code or an HTTP(S) link containing code.',
    example: 'ANTIFAKE-QR-1-batch-id',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  code!: string;
}

export class VerificationProvenanceEventResponseDto {
  @ApiProperty({ example: 'VERIFIED' })
  eventType!: string;

  @ApiProperty({ example: 'mobile_scan' })
  channel!: string;

  @ApiProperty({ example: '2026-08-02T00:00:00.000Z' })
  occurredAt!: Date;
}

export class VerifyProductResponseDto {
  @ApiProperty({ enum: ['VERIFIED', 'SUSPICIOUS', 'INACTIVE', 'NOT_FOUND'] })
  status!: 'VERIFIED' | 'SUSPICIOUS' | 'INACTIVE' | 'NOT_FOUND';

  @ApiProperty({ example: 'QR_BATCH', nullable: true })
  labelType!: string | null;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z', nullable: true })
  issuedAt!: Date | null;

  @ApiProperty({ example: 'Brand ABC', nullable: true })
  brandName!: string | null;

  @ApiProperty({ example: 'Product One', nullable: true })
  productName!: string | null;

  @ApiProperty({ example: 'Model One', nullable: true })
  modelName!: string | null;

  @ApiProperty({ example: 'BATCH-0001', nullable: true })
  batchNumber!: string | null;

  @ApiProperty({ example: 'Việt Nam', nullable: true })
  countryOfOrigin!: string | null;

  @ApiProperty({ example: 'MANUFACTURING', nullable: true })
  sourceType!: string | null;

  @ApiProperty({ type: [VerificationProvenanceEventResponseDto] })
  provenance!: VerificationProvenanceEventResponseDto[];
}
