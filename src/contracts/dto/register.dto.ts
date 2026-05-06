import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({
    description: 'Email dang ky. Phai cung cap email hoac phone.',
    example: 'user@example.com',
    format: 'email',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'So dien thoai dang ky. Phai cung cap email hoac phone.',
    example: '0987654321',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Ten hien thi cua nguoi dung.',
    example: 'Nguyen Van A',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({
    description: 'Mat khau dang nhap, toi thieu 8 ky tu.',
    example: 'StrongPass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
