import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateInvoiceSettingsDto {
  @ApiPropertyOptional({ example: 'INV' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  invoicePrefix?: string;

  @ApiPropertyOptional({ example: 1024 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  invoiceNumber?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showAddress?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  showWebsite?: boolean;

  @ApiPropertyOptional({ example: 'Thank you for dining with us!' })
  @IsOptional()
  @IsString()
  footerText?: string;

  @ApiPropertyOptional({ example: 'Payment due within 7 days.' })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}

export class UpdateInvoiceSettingsRequestDto extends UpdateInvoiceSettingsDto {
  @IsMongoId()
  @IsNotEmpty()
  companyId: string;
}

