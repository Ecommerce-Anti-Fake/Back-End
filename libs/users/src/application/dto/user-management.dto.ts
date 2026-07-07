import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min, ValidateNested } from 'class-validator';

const USER_MANAGEMENT_ROLES = ['user'] as const;
const USER_ACCOUNT_STATUSES = ['active', 'inactive', 'blocked'] as const;
const USER_ACCOUNT_FILTER_STATUSES = ['all', 'active', 'inactive', 'blocked', 'banned'] as const;
const KYC_DOCUMENT_SIDES = ['FRONT', 'BACK'] as const;
const MEDIA_IMAGE_ASSET_TYPES = ['IMAGE'] as const;
const KYC_REVIEW_STATUSES = ['approved', 'rejected'] as const;
const KYC_LOOKUP_STATUSES = ['pending', 'approved', 'rejected'] as const;
const KYC_SORT_FIELDS = ['id', 'fullName', 'verifiedAt'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

class AdminUserStatisticsResponseDto {
  @ApiProperty({ example: 1240 }) orders!: number;
  @ApiProperty({ example: 45 }) posts!: number;
  @ApiProperty({ example: 2 }) reports!: number;
  @ApiProperty({ example: 98, minimum: 0, maximum: 100 }) positiveRate!: number;
}

class AdminUserDetailItemResponseDto {
  @ApiProperty({ example: '73d1fd5d-62e0-4a17-ac4c-fd8db5a4ade7' }) id!: string;
  @ApiPropertyOptional({ nullable: true, example: 'Nguyen Van A' }) displayName!: string | null;
  @ApiPropertyOptional({ nullable: true, example: 'https://cdn.example.com/avatar.jpg' }) avatar!: string | null;
  @ApiPropertyOptional({ nullable: true, example: 'nguyenvana@example.com' }) email!: string | null;
  @ApiPropertyOptional({ nullable: true, example: '0901234567' }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true, example: '123 Duy Tan, Ha Noi' }) address!: string | null;
  @ApiProperty({ example: 'user' }) role!: string;
  @ApiProperty({ example: 'active' }) accountStatus!: string;
  @ApiProperty({ example: true }) emailVerified!: boolean;
  @ApiProperty({ example: true }) phoneVerified!: boolean;
  @ApiProperty({ example: true }) sellerVerified!: boolean;
  @ApiProperty({ example: '2022-10-12T08:00:00.000Z' }) joinedAt!: Date;
  @ApiProperty({ example: '2024-05-15T10:20:00.000Z' }) updatedAt!: Date;
  @ApiProperty({ type: AdminUserStatisticsResponseDto }) statistics!: AdminUserStatisticsResponseDto;
}

class AdminUserShopDetailResponseDto {
  @ApiProperty({ example: 'shop-001' }) id!: string;
  @ApiProperty({ example: 'Masan Consumer Store' }) shopName!: string;
  @ApiPropertyOptional({ nullable: true }) logo!: string | null;
  @ApiPropertyOptional({ nullable: true }) banner!: string | null;
  @ApiProperty({ example: 'verified' }) shopStatus!: string;
  @ApiProperty({ enum: ['pending', 'verified', 'rejected'], example: 'verified' }) verificationStatus!: string;
  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' }) createdAt!: Date;
  @ApiPropertyOptional({ nullable: true, example: 'Hang tieu dung & Thuc pham' }) category!: string | null;
  @ApiPropertyOptional({ nullable: true, example: '123 Duy Tan, Ha Noi' }) address!: string | null;
  @ApiProperty({ example: 4.4 }) rating!: number;
  @ApiProperty({ example: 1200 }) reviewCount!: number;
  @ApiProperty({ example: 91 }) productCount!: number;
  @ApiProperty({ example: 850 }) totalSold!: number;
  @ApiProperty({ example: 450000000 }) revenue!: number;
}

export class AdminUserDetailResponseDto {
  @ApiProperty({ type: AdminUserDetailItemResponseDto }) user!: AdminUserDetailItemResponseDto;
  @ApiPropertyOptional({ type: AdminUserShopDetailResponseDto, nullable: true })
  shop!: AdminUserShopDetailResponseDto | null;
}

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

  @ApiPropertyOptional({
    description: 'Dia chi cua nguoi dung.',
    example: '12 Nguyen Trai, Quan 1, TP.HCM',
    nullable: true,
  })
  address!: string | null;

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

export class AdminUserListItemResponseDto {
  @ApiProperty({
    description: 'ID nguoi dung.',
    example: '73d1fd5d-62e0-4a17-ac4c-fd8db5a4ade7',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Email cua nguoi dung.',
    example: 'e@gmail.com',
    nullable: true,
  })
  email!: string | null;

  @ApiPropertyOptional({
    description: 'Ten hien thi cua nguoi dung.',
    example: 'E',
    nullable: true,
  })
  displayName!: string | null;

  @ApiPropertyOptional({ description: 'URL avatar cua nguoi dung.', nullable: true })
  avatar!: string | null;

  @ApiPropertyOptional({
    description: 'Ten shop moi nhat cua nguoi dung.',
    example: 'E Shop',
    nullable: true,
  })
  shopName!: string | null;

  @ApiProperty({
    description: 'Trang thai tai khoan hien thi cho admin.',
    example: 'Đang hoạt động',
  })
  accountStatus!: string;

  @ApiProperty({
    description: 'Thoi diem tao tai khoan.',
    example: '2026-03-07T00:00:00.000Z',
  })
  createdAt!: Date;
}

export class AdminUserListResponseDto {
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 10 }) pageSize!: number;
  @ApiProperty({ example: 2 }) totalItems!: number;
  @ApiProperty({ example: 1 }) totalPages!: number;
  @ApiProperty({ example: 150 }) totalUser!: number;
  @ApiProperty({ example: 58 }) totalShop!: number;
  @ApiProperty({ example: 138 }) activeUser!: number;
  @ApiProperty({ example: 12 }) bannedUser!: number;
  @ApiProperty({ type: AdminUserListItemResponseDto, isArray: true }) items!: AdminUserListItemResponseDto[];
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

  @ApiPropertyOptional({
    description: 'Dia chi cua nguoi dung.',
    example: '12 Nguyen Trai, Quan 1, TP.HCM',
    nullable: true,
  })
  address!: string | null;

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

export class NotificationResponseDto {
  @ApiProperty({ example: 'notification-id' })
  id!: string;

  @ApiProperty({ example: 'user-id' })
  userId!: string;

  @ApiProperty({ example: 'CHAT_MESSAGE' })
  notificationType!: string;

  @ApiProperty({ example: 'Tin nhan moi' })
  title!: string;

  @ApiProperty({ example: 'Shop vua gui tin nhan cho ban.' })
  body!: string;

  @ApiPropertyOptional({ example: 'CHAT_THREAD', nullable: true })
  targetType!: string | null;

  @ApiPropertyOptional({ example: 'thread-id', nullable: true })
  targetId!: string | null;

  @ApiProperty({ example: 'CHAT_MESSAGE:message-id:user-id' })
  dedupeKey!: string;

  @ApiPropertyOptional({ example: '2026-05-26T09:00:00.000Z', nullable: true })
  readAt!: Date | null;

  @ApiProperty({ example: '2026-05-26T09:00:00.000Z' })
  createdAt!: Date;
}

export class NotificationsResponseDto {
  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 3 })
  unreadCount!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ type: NotificationResponseDto, isArray: true })
  items!: NotificationResponseDto[];
}

export class RegisterNotificationFcmTokenDto {
  @ApiProperty({ example: 'fcm-token-from-browser' })
  @IsString()
  token!: string;

  @ApiPropertyOptional({ example: 'browser-device-id' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class RevokeNotificationFcmTokenDto {
  @ApiPropertyOptional({ example: 'fcm-token-from-browser' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ example: 'browser-device-id' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class NotificationFcmTokenResponseDto {
  @ApiProperty({ example: 'token-row-id' })
  id!: string;

  @ApiPropertyOptional({ example: 'browser-device-id', nullable: true })
  deviceId!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  revokedAt!: Date | null;

  @ApiProperty({ example: '2026-06-04T12:00:00.000Z' })
  updatedAt!: Date;
}

export class RevokeNotificationFcmTokenResponseDto {
  @ApiProperty({ example: 1 })
  revokedCount!: number;
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  unreadOnly?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class UserAddressResponseDto {
  @ApiProperty({ example: 'address-id' })
  id!: string;

  @ApiProperty({ example: 'user-id' })
  userId!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  recipientName!: string;

  @ApiProperty({ example: '0987654321' })
  phone!: string;

  @ApiProperty({ example: '12 Nguyen Trai, Quan 1, TP.HCM' })
  addressLine!: string;

  @ApiPropertyOptional({ example: 'VN-P202', nullable: true })
  provinceCode!: string | null;

  @ApiPropertyOptional({ example: 'TP Ho Chi Minh', nullable: true })
  provinceName!: string | null;

  @ApiPropertyOptional({ example: 'VN-P202-D1450-W21211', nullable: true })
  wardCode!: string | null;

  @ApiPropertyOptional({ example: 'Phuong Ben Nghe', nullable: true })
  wardName!: string | null;

  @ApiProperty({ example: true })
  isDefault!: boolean;

  @ApiProperty({ example: '2026-05-04T09:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-04T09:00:00.000Z' })
  updatedAt!: Date;
}

export class CreateUserAddressDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  recipientName!: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '12 Nguyen Trai, Quan 1, TP.HCM' })
  @IsString()
  addressLine!: string;

  @ApiPropertyOptional({ example: 'VN-P202' })
  @IsOptional()
  @IsString()
  provinceCode?: string;

  @ApiPropertyOptional({ example: 'TP Ho Chi Minh' })
  @IsOptional()
  @IsString()
  provinceName?: string;

  @ApiPropertyOptional({ example: 'VN-P202-D1450-W21211' })
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiPropertyOptional({ example: 'Phuong Ben Nghe' })
  @IsOptional()
  @IsString()
  wardName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateUserAddressDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '12 Nguyen Trai, Quan 1, TP.HCM' })
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiPropertyOptional({ example: 'VN-P202' })
  @IsOptional()
  @IsString()
  provinceCode?: string;

  @ApiPropertyOptional({ example: 'TP Ho Chi Minh' })
  @IsOptional()
  @IsString()
  provinceName?: string;

  @ApiPropertyOptional({ example: 'VN-P202-D1450-W21211' })
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiPropertyOptional({ example: 'Phuong Ben Nghe' })
  @IsOptional()
  @IsString()
  wardName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UserAddressMutationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
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

export class UpdateCurrentUserProfileDto {
  @ApiPropertyOptional({
    description: 'So dien thoai cua user. Gui null hoac chuoi rong de xoa.',
    example: '0987654321',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'Ten hien thi cua user. Gui null hoac chuoi rong de xoa.',
    example: 'Nguyen Van A',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  displayName?: string | null;
}

export class ProfileMutationSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Profile updated successfully.' })
  message!: string;
}

export class AvatarUploadResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Avatar uploaded successfully.' })
  message!: string;

  @ApiProperty({ example: 'media-asset-id' })
  mediaAssetId!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v1/users/user-1/avatar.jpg' })
  avatarUrl!: string;
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

  @ApiPropertyOptional({
    description: 'Loc trang thai; all bo qua dieu kien trang thai, banned gom moi tai khoan khong active.',
    enum: USER_ACCOUNT_FILTER_STATUSES,
    default: 'all',
  })
  @IsOptional()
  @IsString()
  @IsIn(USER_ACCOUNT_FILTER_STATUSES)
  status?: 'all' | 'active' | 'inactive' | 'blocked' | 'banned';

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
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
  @ApiProperty({ example: 'CCCD' })
  @IsString()
  idType!: string;

  @ApiProperty({
    type: SubmitKycDocumentDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitKycDocumentDto)
  documents!: SubmitKycDocumentDto[];
}

export class KycMutationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
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
