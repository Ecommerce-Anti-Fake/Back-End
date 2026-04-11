import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const USER_MANAGEMENT_ROLES = ['user'] as const;
const USER_ACCOUNT_STATUSES = ['active', 'inactive', 'blocked'] as const;

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
