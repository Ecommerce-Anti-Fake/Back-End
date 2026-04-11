import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email hoac so dien thoai dung de dang nhap.',
    example: 'user@gmail.com',
  })
  @IsString()
  username!: string;

  @ApiProperty({
    description: 'Mat khau dang nhap, toi thieu 8 ky tu.',
    example: '11T112003',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
