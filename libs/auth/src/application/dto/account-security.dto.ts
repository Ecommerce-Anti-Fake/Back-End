import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email hoac so dien thoai cua tai khoan can reset mat khau.',
    example: 'user@example.com',
  })
  @IsString()
  identifier!: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'If the account exists, password reset instructions have been created.',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Chi tra ve khi PASSWORD_RESET_RETURN_TOKEN=true cho demo/local.',
    example: 'reset-token-id.raw-secret',
  })
  resetToken?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-id.raw-secret' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'NewStrongPass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldStrongPass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @ApiProperty({ example: 'NewStrongPass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class AccountSecurityResponseDto {
  @ApiProperty({ example: 'Password updated successfully.' })
  message!: string;
}

export class AccountSecurityDecisionsResponseDto {
  @ApiProperty({ example: 'DEFERRED' })
  emailProvider!: 'DEFERRED';

  @ApiProperty({ example: 'DEFERRED' })
  otpProvider!: 'DEFERRED';

  @ApiProperty({ example: 'DEFERRED' })
  oauthLogin!: 'DEFERRED';

  @ApiProperty({ example: false })
  resetTokenReturnedByDefault!: boolean;
}
