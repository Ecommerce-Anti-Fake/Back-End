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
    example: 'https://res.cloudinary.com/demo/image/upload/categories/my-pham.jpg',
    nullable: true,
  })
  imageUrl!: string | null;

  @ApiProperty({ example: 'medium' })
  riskTier!: string;
}

export class CategoryCommandResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Category created successfully.' })
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
