import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email hoặc số điện thoại dùng để đăng nhập.',
    example: 'user@example.com',
  })
  @IsString()
  username!: string;

  @ApiProperty({
    description: 'Mật khẩu đăng nhập, tối thiểu 8 ký tự.',
    example: 'StrongPass123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
