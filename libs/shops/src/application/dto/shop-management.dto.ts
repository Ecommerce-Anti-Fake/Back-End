import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const SHOP_REGISTRATION_TYPES = ['NORMAL', 'HANDMADE', 'MANUFACTURER', 'DISTRIBUTOR'] as const;

export class ShopRegisteredCategoryResponseDto {
  @ApiProperty({
    description: 'ID cua category dang ky.',
    example: '6bd31d93-63d8-4c5a-a9af-c86b4fef3001',
  })
  categoryId!: string;

  @ApiProperty({
    description: 'Ten category dang ky.',
    example: 'My pham',
  })
  categoryName!: string;

  @ApiProperty({
    description: 'Trang thai dang ky category cua shop.',
    example: 'pending',
  })
  registrationStatus!: string;
}

export class ShopResponseDto {
  @ApiProperty({
    description: 'ID cua shop.',
    example: '5b6ef5e7-1a03-4b17-baf3-8c4be0f5f001',
  })
  id!: string;

  @ApiProperty({
    description: 'ID user chu so huu shop.',
    example: '7f13cb95-4f56-4d93-b86d-dbb8e4f4a111',
  })
  ownerUserId!: string;

  @ApiProperty({
    description: 'Ten shop.',
    example: 'Cong ty TNHH San Xuat ABC',
  })
  shopName!: string;

  @ApiProperty({
    description: 'Loai hinh dang ky cua shop.',
    enum: SHOP_REGISTRATION_TYPES,
    example: 'MANUFACTURER',
  })
  registrationType!: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';

  @ApiProperty({
    description: 'Loai hinh kinh doanh.',
    example: 'manufacturer',
  })
  businessType!: string;

  @ApiPropertyOptional({
    description: 'Ma so thue cua shop.',
    example: '0312345678',
    nullable: true,
  })
  taxCode!: string | null;

  @ApiProperty({
    description: 'Trang thai cua shop.',
    example: 'active',
  })
  shopStatus!: string;

  @ApiProperty({
    description: 'Thoi diem tao shop.',
    example: '2026-04-14T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Danh sach nganh hang ma shop da dang ky.',
    type: ShopRegisteredCategoryResponseDto,
    isArray: true,
  })
  registeredCategories!: ShopRegisteredCategoryResponseDto[];
}

export class CreateShopDto {
  @ApiProperty({
    description: 'Ten shop.',
    example: 'Cong ty TNHH San Xuat ABC',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  shopName!: string;

  @ApiProperty({
    description: 'Loai hinh dang ky cua shop.',
    enum: SHOP_REGISTRATION_TYPES,
    example: 'MANUFACTURER',
  })
  @IsString()
  @IsIn(SHOP_REGISTRATION_TYPES)
  registrationType!: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';

  @ApiProperty({
    description: 'Loai hinh kinh doanh cua shop.',
    example: 'manufacturer',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessType!: string;

  @ApiPropertyOptional({
    description: 'Ma so thue cua shop.',
    example: '0312345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxCode?: string;

  @ApiProperty({
    description: 'Danh sach category ma shop muon dang ky kinh doanh.',
    type: String,
    isArray: true,
    example: ['category-id-1', 'category-id-2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categoryIds!: string[];
}
