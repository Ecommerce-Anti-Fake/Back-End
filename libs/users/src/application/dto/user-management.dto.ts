import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min, ValidateNested } from 'class-validator';

const USER_MANAGEMENT_ROLES = ['user'] as const;
const USER_ACCOUNT_STATUSES = ['active', 'inactive', 'blocked'] as const;
const KYC_DOCUMENT_SIDES = ['FRONT', 'BACK'] as const;
const MEDIA_IMAGE_ASSET_TYPES = ['IMAGE'] as const;
const KYC_REVIEW_STATUSES = ['approved', 'rejected'] as const;
const KYC_LOOKUP_STATUSES = ['pending', 'approved', 'rejected'] as const;
const KYC_SORT_FIELDS = ['id', 'fullName', 'verifiedAt'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export class UserResponseDto {
  @ApiProperty({
    description: 'ID nguoi dung.',
    example: '1e5e4f34-1c2d-4d53-9b7b-43f0dbecc001',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Email cua nguoi dung.',
    example: 'buyer@example.com',
    nullable: true,
  })
  email!: string | null;

  @ApiPropertyOptional({
    description: 'So dien thoai cua nguoi dung.',
    example: '0987654321',
    nullable: true,
  })
  phone!: string | null;

  @ApiPropertyOptional({
    description: 'Ten hien thi cua nguoi dung.',
    example: 'Nguyen Van A',
    nullable: true,
  })
  displayName!: string | null;

  @ApiProperty({
    description: 'Vai tro cua nguoi dung.',
    enum: USER_MANAGEMENT_ROLES,
    example: 'user',
  })
  role!: string;

  @ApiProperty({
    description: 'Trang thai tai khoan.',
    enum: USER_ACCOUNT_STATUSES,
    example: 'active',
  })
  accountStatus!: string;

  @ApiProperty({
    description: 'Thoi diem tao tai khoan.',
    example: '2026-04-10T09:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Thoi diem cap nhat gan nhat.',
    example: '2026-04-10T09:30:00.000Z',
  })
  updatedAt!: Date;
}

export class ProfileCompletionResponseDto {
  @ApiProperty({
    description: 'ID nguoi dung.',
    example: '1e5e4f34-1c2d-4d53-9b7b-43f0dbecc001',
  })
  userId!: string;

  @ApiPropertyOptional({
    description: 'Email hien tai cua nguoi dung.',
    example: 'buyer@example.com',
    nullable: true,
  })
  email!: string | null;

  @ApiPropertyOptional({
    description: 'So dien thoai hien tai cua nguoi dung.',
    example: '0987654321',
    nullable: true,
  })
  phone!: string | null;

  @ApiPropertyOptional({
    description: 'Ten hien thi hien tai cua nguoi dung.',
    example: 'Nguyen Van A',
    nullable: true,
  })
  displayName!: string | null;

  @ApiProperty({
    description: 'Cac truong profile con thieu de thuc hien cac flow quan trong.',
    example: ['phone'],
    isArray: true,
  })
  missingProfileFields!: string[];

  @ApiProperty({
    description: 'Nguoi dung da du dieu kien toi thieu de tao order hay chua.',
    example: false,
  })
  isOrderReady!: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Email cua user.',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'So dien thoai cua user.',
    example: '0987654321',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Ten hien thi cua user.',
    example: 'Nguyen Van A',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Loc theo vai tro user.',
    enum: USER_MANAGEMENT_ROLES,
    example: 'user',
  })
  @IsOptional()
  @IsString()
  @IsIn(USER_MANAGEMENT_ROLES)
  role?: 'user';
}

export class KycUploadSignatureItemDto {
  @ApiProperty({
    description: 'Mat cua CCCD.',
    enum: KYC_DOCUMENT_SIDES,
    example: 'FRONT',
  })
  @IsString()
  @IsIn(KYC_DOCUMENT_SIDES)
  side!: 'FRONT' | 'BACK';
}

export class GetKycUploadSignaturesDto {
  @ApiProperty({
    description: 'Danh sach mat giay to can xin chu ky upload.',
    type: KycUploadSignatureItemDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KycUploadSignatureItemDto)
  items!: KycUploadSignatureItemDto[];
}

export class KycUploadSignatureResponseDto {
  @ApiProperty({ example: 'dbpa0ndt0' })
  cloudName!: string;

  @ApiProperty({ example: '123456789012345' })
  apiKey!: string;

  @ApiProperty({ example: 1776240000 })
  timestamp!: number;

  @ApiProperty({ example: 'kyc/user-1' })
  folder!: string;

  @ApiProperty({ example: 'kyc/user-1/user-1-1776240000-1' })
  publicId!: string;

  @ApiProperty({ example: 'image', enum: ['image'] })
  uploadResourceType!: 'image';

  @ApiProperty({ example: 'abcdef1234567890' })
  signature!: string;
}

export class SubmitKycDocumentDto {
  @ApiProperty({
    description: 'Mat cua CCCD.',
    enum: KYC_DOCUMENT_SIDES,
    example: 'FRONT',
  })
  @IsString()
  @IsIn(KYC_DOCUMENT_SIDES)
  side!: 'FRONT' | 'BACK';

  @ApiProperty({
    description: 'Loai asset cho KYC. Hien tai chi chap nhan anh.',
    enum: MEDIA_IMAGE_ASSET_TYPES,
    example: 'IMAGE',
  })
  @IsString()
  @IsIn(MEDIA_IMAGE_ASSET_TYPES)
  assetType!: 'IMAGE';

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/kyc/user-1/front.jpg' })
  @IsString()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
  })
  fileUrl!: string;

  @ApiProperty({ example: 'kyc/user-1/user-1-1776240000-1' })
  @IsString()
  publicId!: string;
}

export class SubmitKycDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: '1998-05-10' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'CCCD' })
  @IsString()
  idType!: string;

  @ApiProperty({ example: '079123456789' })
  @IsString()
  idNumber!: string;

  @ApiProperty({
    type: SubmitKycDocumentDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitKycDocumentDto)
  documents!: SubmitKycDocumentDto[];
}

export class UserKycDocumentResponseDto {
  @ApiProperty({ example: 'FRONT' })
  side!: 'FRONT' | 'BACK';

  @ApiProperty({ example: 'media-asset-id' })
  mediaAssetId!: string;

  @ApiProperty({ example: 'IMAGE' })
  assetType!: 'IMAGE' | 'VIDEO' | 'RAW';

  @ApiPropertyOptional({ example: 'image/jpeg', nullable: true })
  mimeType!: string | null;

  @ApiPropertyOptional({ example: 'kyc/user-1/user-1-1776240000-1', nullable: true })
  publicId!: string | null;

  @ApiProperty({ example: 'https://res.cloudinary.com/example/image/upload/v1/kyc/user-1/front.jpg' })
  fileUrl!: string;
}

export class UserKycResponseDto {
  @ApiProperty({ example: 'kyc-id' })
  id!: string;

  @ApiProperty({ example: 'user-id' })
  userId!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiProperty({ example: '1998-05-10T00:00:00.000Z' })
  dateOfBirth!: Date;

  @ApiProperty({ example: 'CCCD' })
  idType!: string;

  @ApiProperty({ example: 'basic' })
  kycLevel!: string;

  @ApiProperty({ example: 'pending' })
  verificationStatus!: string;

  @ApiPropertyOptional({ example: 'Can bo sung hinh anh ro net hon', nullable: true })
  reviewNote!: string | null;

  @ApiPropertyOptional({ example: '2026-04-15T10:00:00.000Z', nullable: true })
  verifiedAt!: Date | null;

  @ApiProperty({
    type: UserKycDocumentResponseDto,
    isArray: true,
  })
  documents!: UserKycDocumentResponseDto[];
}

export class PendingKycQueryDto {
  @ApiPropertyOptional({
    description: 'Trang thai KYC can loc cho admin. Hien tai mac dinh la pending.',
    enum: KYC_LOOKUP_STATUSES,
    example: 'pending',
  })
  @IsOptional()
  @IsString()
  @IsIn(KYC_LOOKUP_STATUSES)
  verificationStatus?: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Tu khoa tim theo ho ten, email hoac so dien thoai.',
    example: 'nguyen van a',
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
    description: 'Truong sap xep danh sach KYC.',
    enum: KYC_SORT_FIELDS,
    example: 'id',
  })
  @IsOptional()
  @IsString()
  @IsIn(KYC_SORT_FIELDS)
  sortBy?: 'id' | 'fullName' | 'verifiedAt';

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

export class AdminUserKycItemResponseDto {
  @ApiProperty({ example: 'kyc-id' })
  id!: string;

  @ApiProperty({ example: 'user-id' })
  userId!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiPropertyOptional({ example: 'buyer@example.com', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ example: '0987654321', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'pending' })
  verificationStatus!: string;

  @ApiProperty({ example: 'CCCD' })
  idType!: string;

  @ApiProperty({ example: '2026-04-15T10:00:00.000Z' })
  submittedAt!: Date;

  @ApiProperty({
    type: UserKycDocumentResponseDto,
    isArray: true,
  })
  documents!: UserKycDocumentResponseDto[];
}

export class PaginatedAdminUserKycResponseDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 37 })
  total!: number;

  @ApiProperty({ type: AdminUserKycItemResponseDto, isArray: true })
  items!: AdminUserKycItemResponseDto[];
}

export class UserKycSubmissionResponseDto {
  @ApiProperty({ example: 'submission-1' })
  id!: string;

  @ApiProperty({ example: 2 })
  submissionNumber!: number;

  @ApiProperty({ example: 'pending' })
  verificationStatus!: string;

  @ApiPropertyOptional({ example: 'Can bo sung anh ro hon', nullable: true })
  reviewNote!: string | null;

  @ApiPropertyOptional({ example: '2026-04-16T09:15:00.000Z', nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ example: '2026-04-16T08:30:00.000Z' })
  submittedAt!: Date;

  @ApiProperty({
    type: UserKycDocumentResponseDto,
    isArray: true,
  })
  documents!: UserKycDocumentResponseDto[];
}

export class AuditLogResponseDto {
  @ApiProperty({ example: 'audit-log-id' })
  id!: string;

  @ApiProperty({ example: 'KYC_SUBMITTED' })
  action!: string;

  @ApiPropertyOptional({ example: 'pending', nullable: true })
  fromStatus!: string | null;

  @ApiPropertyOptional({ example: 'approved', nullable: true })
  toStatus!: string | null;

  @ApiPropertyOptional({ example: 'Thong tin hop le', nullable: true })
  note!: string | null;

  @ApiProperty({ example: 'admin-user-id' })
  actorUserId!: string;

  @ApiPropertyOptional({ example: 'Nguyen Van B', nullable: true })
  actorDisplayName!: string | null;

  @ApiPropertyOptional({ example: 'admin@example.com', nullable: true })
  actorEmail!: string | null;

  @ApiProperty({ example: '2026-04-16T10:00:00.000Z' })
  createdAt!: Date;
}

export class AdminUserKycDetailResponseDto {
  @ApiProperty({ example: 'kyc-id' })
  id!: string;

  @ApiProperty({ example: 'user-id' })
  userId!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiPropertyOptional({ example: 'buyer@example.com', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ example: '0987654321', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'approved' })
  verificationStatus!: string;

  @ApiPropertyOptional({ example: 'Thong tin hop le', nullable: true })
  reviewNote!: string | null;

  @ApiPropertyOptional({ example: '2026-04-16T09:15:00.000Z', nullable: true })
  verifiedAt!: Date | null;

  @ApiProperty({
    type: UserKycDocumentResponseDto,
    isArray: true,
  })
  currentDocuments!: UserKycDocumentResponseDto[];

  @ApiProperty({
    type: UserKycSubmissionResponseDto,
    isArray: true,
  })
  submissions!: UserKycSubmissionResponseDto[];

  @ApiProperty({
    type: AuditLogResponseDto,
    isArray: true,
  })
  timeline!: AuditLogResponseDto[];
}

export class ReviewUserKycDto {
  @ApiProperty({
    description: 'Ket qua duyet KYC.',
    enum: KYC_REVIEW_STATUSES,
    example: 'approved',
  })
  @IsString()
  @IsIn(KYC_REVIEW_STATUSES)
  verificationStatus!: 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Ghi chu review KYC.',
    example: 'Thong tin hop le',
  })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
