import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateRegistrationChallengeDto {
  @ApiProperty({ enum: ['EMAIL', 'PHONE'] })
  @IsIn(['EMAIL', 'PHONE'])
  channel!: 'EMAIL' | 'PHONE';
}

export class ConfirmRegistrationChallengeDto {
  @ApiProperty({
    description:
      'Fresh Firebase ID token produced by the selected verification flow.',
  })
  @IsString()
  idToken!: string;

  @ApiPropertyOptional({
    description: 'Opaque email-link state; required for EMAIL challenges.',
  })
  @IsOptional()
  @IsString()
  state?: string;
}

export class RegistrationDetailsDto {
  @ApiProperty({ enum: ['LOCAL', 'GOOGLE'] })
  provider!: 'LOCAL' | 'GOOGLE';

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty()
  expiresAt!: Date;
}

export class RegistrationChallengeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['EMAIL', 'PHONE'] })
  channel!: 'EMAIL' | 'PHONE';

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  resendAt!: Date;

  @ApiPropertyOptional()
  state?: string;
}
