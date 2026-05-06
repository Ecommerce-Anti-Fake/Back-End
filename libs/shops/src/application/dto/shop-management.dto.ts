import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const SHOP_REGISTRATION_TYPES = ['NORMAL', 'HANDMADE', 'MANUFACTURER', 'DISTRIBUTOR'] as const;
const REVIEW_STATUSES = ['approved', 'rejected'] as const;
const SHOP_LOOKUP_STATUSES = ['pending_kyc', 'pending_verification', 'active'] as const;
const SHOP_SORT_FIELDS = ['createdAt', 'shopName'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

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

export class MediaUploadSignatureResponseDto {
  @ApiProperty({ example: 'dbpa0ndt0' })
  cloudName!: string;

  @ApiProperty({ example: '123456789012345' })
  apiKey!: string;

  @ApiProperty({ example: 1776240000 })
  timestamp!: number;

  @ApiProperty({ example: 'shops/shop-1/documents' })
  folder!: string;

  @ApiProperty({ example: 'shops/shop-1/documents/user-1-1776240000-1' })
  publicId!: string;

  @ApiProperty({ example: 'image' })
  uploadResourceType!: 'image';

  @ApiProperty({ example: 'abcdef1234567890' })
  signature!: string;
}

export class ShopDocumentResponseDto {
  @ApiProperty({ example: 'document-1' })
  id!: string;

  @ApiProperty({ example: 'BUSINESS_LICENSE' })
  docType!: string;

  @ApiPropertyOptional({ example: 'req-business-license', nullable: true })
  requirementId!: string | null;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/shops/shop-1/documents/license.jpg' })
  fileUrl!: string;

  @ApiPropertyOptional({ example: 'media-asset-1', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty({
    example: [
      {
        id: 'document-file-1',
        fileUrl: 'https://res.cloudinary.com/example/image/upload/v1/shops/shop-1/documents/license-front.jpg',
        mediaAssetId: 'media-asset-1',
        sortOrder: 0,
        uploadedAt: '2026-04-15T10:00:00.000Z',
      },
    ],
  })
  files!: Array<{
    id: string;
    fileUrl: string;
    mediaAssetId: string;
    sortOrder: number;
    uploadedAt: Date;
  }>;

  @ApiProperty({ example: 'pending' })
  reviewStatus!: string;

  @ApiPropertyOptional({ example: 'Ho so hop le', nullable: true })
  reviewNote!: string | null;

  @ApiPropertyOptional({ example: '2026-04-15T11:00:00.000Z', nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ example: '2026-04-15T10:00:00.000Z' })
  uploadedAt!: Date;
}

export class ShopCategoryDocumentResponseDto {
  @ApiProperty({ example: 'category-document-1' })
  id!: string;

  @ApiProperty({ example: 'CATEGORY_CERTIFICATE' })
  documentType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/shops/shop-1/categories/category-1/certificate.jpg' })
  fileUrl!: string;

  @ApiPropertyOptional({ example: 'media-asset-2', nullable: true })
  mediaAssetId!: string | null;

  @ApiPropertyOptional({ example: 'GCN-001', nullable: true })
  documentNumber!: string | null;

  @ApiPropertyOptional({ example: 'Bo Y Te', nullable: true })
  issuedBy!: string | null;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  issuedAt!: Date | null;

  @ApiPropertyOptional({ example: '2028-01-01T00:00:00.000Z', nullable: true })
  expiresAt!: Date | null;

  @ApiProperty({ example: 'pending' })
  reviewStatus!: string;

  @ApiPropertyOptional({ example: 'Can bo sung ho so nguon goc', nullable: true })
  reviewNote!: string | null;

  @ApiPropertyOptional({ example: '2026-04-15T11:00:00.000Z', nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ example: '2026-04-15T10:00:00.000Z' })
  uploadedAt!: Date;
}

export class BrandAuthorizationResponseDto {
  @ApiProperty({ example: 'brand-auth-1' })
  id!: string;

  @ApiProperty({ example: 'shop-1' })
  shopId!: string;

  @ApiProperty({ example: 'brand-1' })
  brandId!: string;

  @ApiPropertyOptional({ example: 'media-asset-1', nullable: true })
  mediaAssetId!: string | null;

  @ApiProperty({ example: 'DISTRIBUTOR_AUTHORIZATION' })
  authorizationType!: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/example/raw/upload/v1/shops/shop-1/brands/brand-1/authorization.pdf',
    nullable: true,
  })
  fileUrl!: string | null;

  @ApiProperty({ example: 'pending' })
  verificationStatus!: string;

  @ApiPropertyOptional({ example: 'Can bo sung hop dong uy quyen', nullable: true })
  reviewNote!: string | null;

  @ApiPropertyOptional({ example: '2026-04-16T14:20:00.000Z', nullable: true })
  verifiedAt!: Date | null;

  @ApiProperty({ example: '2026-04-16T14:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: 'application/pdf', nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ example: 'shops/shop-1/brands/brand-1/user-1-1776240000-1', nullable: true })
  publicId!: string | null;
}

export class ShopVerificationCategoryResponseDto {
  @ApiProperty({ example: 'category-1' })
  categoryId!: string;

  @ApiProperty({ example: 'My pham' })
  categoryName!: string;

  @ApiProperty({ example: 'high' })
  riskTier!: string;

  @ApiProperty({ example: true })
  requiredVerification!: boolean;

  @ApiProperty({ example: 'pending' })
  registrationStatus!: string;

  @ApiPropertyOptional({ example: 'Can bo sung giay phep luu hanh', nullable: true })
  reviewNote!: string | null;

  @ApiPropertyOptional({ example: '2026-04-15T11:00:00.000Z', nullable: true })
  approvedAt!: Date | null;

  @ApiProperty({ example: 2 })
  documentCount!: number;

  @ApiProperty({ example: 1 })
  approvedDocumentCount!: number;
}

export class ShopVerificationSummaryResponseDto {
  @ApiProperty({ example: 'shop-1' })
  shopId!: string;

  @ApiProperty({ example: 'pending_verification' })
  shopStatus!: string;

  @ApiProperty({
    enum: SHOP_REGISTRATION_TYPES,
    example: 'MANUFACTURER',
  })
  registrationType!: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';

  @ApiProperty({ example: false })
  canOperate!: boolean;

  @ApiProperty({ example: 'approved' })
  kycStatus!: 'missing' | 'pending' | 'approved' | 'rejected';

  @ApiProperty({ example: true })
  hasRequiredKycDocuments!: boolean;

  @ApiProperty({ example: true })
  requiresShopDocuments!: boolean;

  @ApiProperty({ example: true })
  hasApprovedShopDocument!: boolean;

  @ApiProperty({ example: 2 })
  totalShopDocuments!: number;

  @ApiProperty({ example: 1 })
  approvedShopDocuments!: number;

  @ApiProperty({ type: String, isArray: true, example: ['CATEGORY_APPROVAL_REQUIRED'] })
  missingRequirements!: string[];

  @ApiProperty({ type: ShopVerificationCategoryResponseDto, isArray: true })
  categories!: ShopVerificationCategoryResponseDto[];
}

export class PendingVerificationShopResponseDto {
  @ApiProperty({ example: 'shop-1' })
  id!: string;

  @ApiProperty({ example: 'Cong ty TNHH San Xuat ABC' })
  shopName!: string;

  @ApiProperty({ example: 'user-1' })
  ownerUserId!: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A', nullable: true })
  ownerDisplayName!: string | null;

  @ApiPropertyOptional({ example: 'owner@example.com', nullable: true })
  ownerEmail!: string | null;

  @ApiPropertyOptional({ example: '0987654321', nullable: true })
  ownerPhone!: string | null;

  @ApiProperty({
    enum: SHOP_REGISTRATION_TYPES,
    example: 'MANUFACTURER',
  })
  registrationType!: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';

  @ApiProperty({ example: 'pending_verification' })
  shopStatus!: string;

  @ApiProperty({ example: 1 })
  shopDocumentCount!: number;

  @ApiProperty({ example: 0 })
  approvedShopDocumentCount!: number;

  @ApiProperty({ type: ShopRegisteredCategoryResponseDto, isArray: true })
  registeredCategories!: ShopRegisteredCategoryResponseDto[];

  @ApiProperty({ example: '2026-04-15T10:00:00.000Z' })
  createdAt!: Date;
}

export class PendingVerificationShopQueryDto {
  @ApiPropertyOptional({
    description: 'Loc theo trang thai shop.',
    enum: SHOP_LOOKUP_STATUSES,
    example: 'pending_verification',
  })
  @IsOptional()
  @IsString()
  @IsIn(SHOP_LOOKUP_STATUSES)
  shopStatus?: 'pending_kyc' | 'pending_verification' | 'active';

  @ApiPropertyOptional({
    description: 'Loc theo loai dang ky cua shop.',
    enum: SHOP_REGISTRATION_TYPES,
    example: 'MANUFACTURER',
  })
  @IsOptional()
  @IsString()
  @IsIn(SHOP_REGISTRATION_TYPES)
  registrationType?: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';

  @ApiPropertyOptional({
    description: 'Loc theo category ma shop da dang ky.',
    example: 'category-1',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Tu khoa tim theo ten shop, owner display name, email hoac phone.',
    example: 'factory',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Trang hien tai.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'So phan tu moi trang.',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Truong sap xep danh sach shop moderation.',
    enum: SHOP_SORT_FIELDS,
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(SHOP_SORT_FIELDS)
  sortBy?: 'createdAt' | 'shopName';

  @ApiPropertyOptional({
    description: 'Thu tu sap xep.',
    enum: SORT_ORDERS,
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(SORT_ORDERS)
  sortOrder?: 'asc' | 'desc';
}

export class PaginatedPendingVerificationShopResponseDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ type: PendingVerificationShopResponseDto, isArray: true })
  items!: PendingVerificationShopResponseDto[];
}

export class AdminShopVerificationDetailResponseDto {
  @ApiProperty({ type: ShopResponseDto })
  shop!: ShopResponseDto;

  @ApiProperty({ type: ShopVerificationSummaryResponseDto })
  summary!: ShopVerificationSummaryResponseDto;

  @ApiProperty({ type: ShopDocumentResponseDto, isArray: true })
  shopDocuments!: ShopDocumentResponseDto[];

  @ApiProperty({
    type: ShopCategoryDocumentResponseDto,
    isArray: true,
    description: 'Toan bo ho so category cua shop, gom ca categoryId/categoryName.',
  })
  categoryDocuments!: Array<ShopCategoryDocumentResponseDto & { categoryId: string; categoryName: string }>;

  @ApiProperty({
    description: 'Ho so shop duoc nhom theo loai tai lieu, gom lan nop moi nhat va lich su review.',
    isArray: true,
  })
  shopDocumentGroups!: Array<{
    docType: string;
    latestSubmission: ShopDocumentResponseDto;
    history: ShopDocumentResponseDto[];
  }>;

  @ApiProperty({
    description: 'Ho so category duoc nhom theo category va documentType, gom lan nop moi nhat va lich su review.',
    isArray: true,
  })
  categoryDocumentGroups!: Array<{
    categoryId: string;
    categoryName: string;
    documentType: string;
    latestSubmission: ShopCategoryDocumentResponseDto;
    history: ShopCategoryDocumentResponseDto[];
  }>;

  @ApiProperty({
    description: 'Timeline hoat dong verification cua shop.',
    isArray: true,
  })
  timeline!: Array<{
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    note: string | null;
    actorUserId: string;
    actorDisplayName: string | null;
    actorEmail: string | null;
    createdAt: Date;
  }>;
}

export class ShopDocumentSignatureItemDto {
  @ApiProperty({ example: 'BUSINESS_LICENSE' })
  @IsString()
  docType!: string;
}

export class ShopDocumentUploadSignaturesDto {
  @ApiProperty({ type: ShopDocumentSignatureItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShopDocumentSignatureItemDto)
  items!: ShopDocumentSignatureItemDto[];
}

export class SubmitShopDocumentItemDto {
  @ApiProperty({ example: 'BUSINESS_LICENSE' })
  @IsString()
  docType!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/shops/shop-1/documents/license.jpg' })
  @IsString()
  fileUrl!: string;

  @ApiProperty({ example: 'shops/shop-1/documents/user-1-1776240000-1' })
  @IsString()
  publicId!: string;
}

export class SubmitShopDocumentsDto {
  @ApiProperty({ type: SubmitShopDocumentItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitShopDocumentItemDto)
  items!: SubmitShopDocumentItemDto[];
}

export class CategoryDocumentSignatureItemDto {
  @ApiProperty({ example: 'CATEGORY_CERTIFICATE' })
  @IsString()
  documentType!: string;
}

export class CategoryDocumentUploadSignaturesDto {
  @ApiProperty({ type: CategoryDocumentSignatureItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryDocumentSignatureItemDto)
  items!: CategoryDocumentSignatureItemDto[];
}

export class SubmitBrandAuthorizationDto {
  @ApiProperty({ example: 'DISTRIBUTOR_AUTHORIZATION' })
  @IsString()
  authorizationType!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/example/raw/upload/v1/shops/shop-1/brands/brand-1/authorization.pdf',
  })
  @IsString()
  fileUrl!: string;

  @ApiProperty({ example: 'shops/shop-1/brands/brand-1/user-1-1776240000-1' })
  @IsString()
  publicId!: string;
}

export class SubmitCategoryDocumentItemDto {
  @ApiProperty({ example: 'CATEGORY_CERTIFICATE' })
  @IsString()
  documentType!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/shops/shop-1/categories/category-1/certificate.jpg' })
  @IsString()
  fileUrl!: string;

  @ApiProperty({ example: 'shops/shop-1/categories/category-1/user-1-1776240000-1' })
  @IsString()
  publicId!: string;

  @ApiPropertyOptional({ example: 'GCN-001' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'Bo Y Te' })
  @IsOptional()
  @IsString()
  issuedBy?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional({ example: '2028-01-01' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class SubmitCategoryDocumentsDto {
  @ApiProperty({ type: SubmitCategoryDocumentItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitCategoryDocumentItemDto)
  items!: SubmitCategoryDocumentItemDto[];
}

export class ReviewShopDocumentDto {
  @ApiProperty({ enum: REVIEW_STATUSES, example: 'approved' })
  @IsString()
  @IsIn(REVIEW_STATUSES)
  reviewStatus!: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Ho so hop le' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class ReviewShopCategoryDto {
  @ApiProperty({ enum: REVIEW_STATUSES, example: 'approved' })
  @IsString()
  @IsIn(REVIEW_STATUSES)
  registrationStatus!: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Da doi chieu giay to nganh hang' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class ReviewBrandAuthorizationDto {
  @ApiProperty({ enum: REVIEW_STATUSES, example: 'approved' })
  @IsString()
  @IsIn(REVIEW_STATUSES)
  verificationStatus!: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Ho so uy quyen hop le' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
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

export class UpdateShopProfileDto {
  @ApiPropertyOptional({
    description: 'Ten shop hien thi tren gian hang.',
    example: 'Thuc pham Au Lac',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  shopName?: string;

  @ApiPropertyOptional({
    description: 'Loai hinh kinh doanh cua shop.',
    example: 'Buon ban thuc pham',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessType?: string;

  @ApiPropertyOptional({
    description: 'Ma so thue, DKKD hoac CCCD dai dien.',
    example: '0312345678',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxCode?: string | null;
}

export class UpdateShopRegistrationTypeDto {
  @ApiProperty({
    description: 'Loai tai khoan gian hang moi.',
    enum: SHOP_REGISTRATION_TYPES,
    example: 'DISTRIBUTOR',
  })
  @IsString()
  @IsIn(SHOP_REGISTRATION_TYPES)
  registrationType!: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
}
