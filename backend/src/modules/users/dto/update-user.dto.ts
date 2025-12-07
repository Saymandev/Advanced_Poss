import { PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @IsOptional()
  @IsString()
  twoFactorSecret?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  twoFactorBackupCodes?: string[];
}

