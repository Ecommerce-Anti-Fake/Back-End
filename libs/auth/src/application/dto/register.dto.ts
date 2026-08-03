import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Firebase Email/Password ID token.' })
  @IsString()
  idToken!: string;

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
}
