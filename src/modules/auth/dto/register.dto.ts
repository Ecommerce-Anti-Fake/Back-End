import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({
    description: 'Email đăng ký. Phải cung cấp email hoặc phone.',
    example: 'user@example.com',
    format: 'email',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại đăng ký. Phải cung cấp email hoặc phone.',
    example: '0987654321',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Tên hiển thị của người dùng.',
    example: 'Nguyen Van A',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({
    description: 'Mật khẩu đăng nhập, tối thiểu 8 ký tự.',
    example: 'StrongPass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
