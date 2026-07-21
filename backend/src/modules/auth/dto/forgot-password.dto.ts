import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'sms', required: false, enum: ['email', 'sms'] })
  @IsOptional()
  @IsEnum(['email', 'sms'])
  method?: 'email' | 'sms';
}

