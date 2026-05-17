import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateIncomeDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'Catering Service Payment' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Event catering for John Doe Wedding' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: [
      'catering',
      'event',
      'room-service',
      'interest',
      'other',
    ],
    example: 'catering',
  })
  @IsEnum([
    'catering',
    'event',
    'room-service',
    'interest',
    'other',
  ])
  category: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({
    example: 'cash',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'INV-2024-001' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439014' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiPropertyOptional({ example: 'https://example.com/receipt.pdf' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ example: 'Client paid in cash at counter' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: ['wedding', 'catering'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  @IsEnum(['pending', 'received'])
  status?: string;
}
