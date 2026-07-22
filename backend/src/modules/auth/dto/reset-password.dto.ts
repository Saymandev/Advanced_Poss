import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;
  @ApiProperty({ example: '1234 or NewSecurePass123!' })
  @IsString()
  @MinLength(4, { message: 'Password or PIN must be at least 4 characters long' })
  newPassword: string;
}

