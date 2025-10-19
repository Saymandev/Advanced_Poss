import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    IsUrl,
    Min,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'ABC Suppliers Inc.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Leading food supplier' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiProperty({
    enum: ['food', 'beverage', 'equipment', 'packaging', 'service', 'other'],
    example: 'food',
  })
  @IsEnum(['food', 'beverage', 'equipment', 'packaging', 'service', 'other'])
  type: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @ApiProperty({ example: 'contact@abcsuppliers.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: '+1234567891' })
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'https://abcsuppliers.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    example: {
      street: '123 Business St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
    },
  })
  @IsObject()
  @IsNotEmpty()
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @ApiPropertyOptional({ example: 'TAX123456' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'REG789012' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({
    enum: ['net-7', 'net-15', 'net-30', 'net-60', 'cod', 'prepaid'],
    example: 'net-30',
  })
  @IsEnum(['net-7', 'net-15', 'net-30', 'net-60', 'cod', 'prepaid'])
  paymentTerms: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({
    example: {
      bankName: 'Bank of America',
      accountNumber: '1234567890',
      accountName: 'ABC Suppliers Inc.',
      ifscCode: 'BOFAUS3N',
      swiftCode: 'BOFAUS3NXXX',
    },
  })
  @IsOptional()
  @IsObject()
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    ifscCode?: string;
    swiftCode?: string;
  };

  @ApiPropertyOptional({ example: ['Vegetables', 'Fruits', 'Dairy'] })
  @IsOptional()
  @IsArray()
  productCategories?: string[];

  @ApiPropertyOptional({ example: ['ISO-9001', 'HACCP'] })
  @IsOptional()
  @IsArray()
  certifications?: string[];

  @ApiPropertyOptional({ example: 'Reliable supplier with good prices' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: ['preferred', 'local'] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

