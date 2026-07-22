import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class SetLocalCredentialsDto {
  @ApiProperty({ description: 'Fresh Firebase Google ID token.' })
  @IsString()
  idToken!: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @Matches(/^(0\d{9}|\+84\d{9})$/)
  phone!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
