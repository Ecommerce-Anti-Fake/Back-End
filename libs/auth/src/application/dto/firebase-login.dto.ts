import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FirebaseLoginDto {
  @ApiProperty({
    description: 'Firebase ID token da duoc cap sau khi email verified hoac phone OTP thanh cong.',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...firebase...',
  })
  @IsString()
  idToken!: string;

  @ApiPropertyOptional({
    description: 'Ten hien thi khi tao user moi tu Firebase.',
    example: 'Nguyen Van A',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
