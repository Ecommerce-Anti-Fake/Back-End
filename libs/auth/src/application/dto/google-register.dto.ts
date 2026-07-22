import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GoogleRegisterDto {
  @ApiProperty({ description: 'Firebase Google ID token.' })
  @IsString()
  idToken!: string;
}
