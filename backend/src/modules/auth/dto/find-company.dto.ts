import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsOptional, IsString } from 'class-validator';

export class FindCompanyDto {
  @ApiProperty({
    example: 'company@example.com',
    description: 'Company or user email',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Company ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsMongoId()
  companyId?: string;
}

