import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token hiện tại dùng để rotate hoặc logout session.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token-example.signature',
    minLength: 16,
  })
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}
