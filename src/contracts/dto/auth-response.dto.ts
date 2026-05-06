import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({
    description: 'ID nguoi dung.',
    example: '1e5e4f34-1c2d-4d53-9b7b-43f0dbecc001',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Email cua nguoi dung.',
    example: 'user@example.com',
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
    example: 'user',
  })
  role!: string;

  @ApiProperty({
    description: 'Trang thai tai khoan.',
    example: 'active',
  })
  accountStatus!: string;

  @ApiPropertyOptional({
    description: 'Thoi diem tao tai khoan.',
    example: '2026-04-07T09:30:00.000Z',
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Thoi diem cap nhat gan nhat.',
    example: '2026-04-07T09:30:00.000Z',
  })
  updatedAt?: Date;
}

export class RegisterResponseDto extends AuthUserResponseDto {}

export class TokenPairResponseDto {
  @ApiProperty({
    description: 'Access token ngan han de goi API.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.signature',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh token dung de lay cap token moi.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.signature',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Thong tin user an toan, khong chua password.',
    type: AuthUserResponseDto,
  })
  user!: AuthUserResponseDto;
}

export class LoginResponseDto extends TokenPairResponseDto {}

export class RefreshResponseDto extends TokenPairResponseDto {}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Cho biet session hien tai da duoc revoke thanh cong.',
    example: true,
  })
  loggedOut!: boolean;
}

export class AdminAccessResponseDto {
  @ApiProperty({
    description: 'Thong bao xac nhan user co quyen admin.',
    example: 'Admin access granted',
  })
  message!: string;

  @ApiProperty({
    description: 'Thong tin user hien tai.',
    type: AuthUserResponseDto,
  })
  user!: AuthUserResponseDto;
}
