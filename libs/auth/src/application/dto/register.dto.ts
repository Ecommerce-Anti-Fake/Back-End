import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email bat buoc cua tai khoan.',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'So dien thoai Viet Nam bat buoc cua tai khoan.',
    example: '0987654321',
  })
  @IsString()
  @Matches(/^(0\d{9}|\+84\d{9})$/)
  phone!: string;

  @ApiProperty({
    description: 'Ten hien thi cua nguoi dung.',
    example: 'Nguyen Van A',
  })
  @IsString()
  @MinLength(3)
  displayName!: string;

  @ApiProperty({
    description: 'Mat khau dang nhap, toi thieu 8 ky tu.',
    example: 'StrongPass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
