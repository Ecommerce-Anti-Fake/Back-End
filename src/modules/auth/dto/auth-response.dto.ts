import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({
    description: 'ID người dùng.',
    example: '1e5e4f34-1c2d-4d53-9b7b-43f0dbecc001',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Email của người dùng.',
    example: 'user@example.com',
    nullable: true,
  })
  email!: string | null;

  @ApiPropertyOptional({
    description: 'Số điện thoại của người dùng.',
    example: '0987654321',
    nullable: true,
  })
  phone!: string | null;

  @ApiPropertyOptional({
    description: 'Tên hiển thị.',
    example: 'Nguyen Van A',
    nullable: true,
  })
  displayName!: string | null;

  @ApiProperty({
    description: 'Vai trò của người dùng.',
    example: 'user',
  })
  role!: string;

  @ApiProperty({
    description: 'Trạng thái tài khoản.',
    example: 'active',
  })
  accountStatus!: string;

  @ApiPropertyOptional({
    description: 'Thời điểm tạo tài khoản.',
    example: '2026-04-07T09:30:00.000Z',
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Thời điểm cập nhật gần nhất.',
    example: '2026-04-07T09:30:00.000Z',
  })
  updatedAt?: Date;
}

export class RegisterResponseDto extends AuthUserResponseDto {}

export class TokenPairResponseDto {
  @ApiProperty({
    description: 'Access token ngắn hạn để gọi API.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.signature',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh token dùng để lấy cặp token mới.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.signature',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Thông tin user an toàn, không chứa password.',
    type: AuthUserResponseDto,
  })
  user!: AuthUserResponseDto;
}

export class LoginResponseDto extends TokenPairResponseDto {}

export class RefreshResponseDto extends TokenPairResponseDto {}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Cho biết session hiện tại đã được revoke thành công.',
    example: true,
  })
  loggedOut!: boolean;
}
