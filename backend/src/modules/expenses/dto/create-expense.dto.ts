import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'Monthly Rent Payment' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Office rent for January 2024' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: [
      'ingredient',
      'utility',
      'rent',
      'salary',
      'maintenance',
      'marketing',
      'equipment',
      'transport',
      'other',
    ],
    example: 'rent',
  })
  @IsEnum([
    'ingredient',
    'utility',
    'rent',
    'salary',
    'maintenance',
    'marketing',
    'equipment',
    'transport',
    'other',
  ])
  category: string;

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({
    enum: ['cash', 'card', 'bank-transfer', 'cheque', 'online', 'other'],
    example: 'bank-transfer',
  })
  @IsEnum(['cash', 'card', 'bank-transfer', 'cheque', 'online', 'other'])
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'INV-2024-001' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: 'ABC Suppliers' })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  vendorPhone?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439013' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439014' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiPropertyOptional({ example: ['receipt.pdf', 'invoice.pdf'] })
  @IsOptional()
  @IsArray()
  attachments?: string[];

  @ApiPropertyOptional({ example: 'https://example.com/receipt.pdf' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ example: 'Monthly recurring payment' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly', 'yearly'] })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  recurringFrequency?: string;

  @ApiPropertyOptional({ example: ['rent', 'fixed-cost'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439015' })
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;
}

