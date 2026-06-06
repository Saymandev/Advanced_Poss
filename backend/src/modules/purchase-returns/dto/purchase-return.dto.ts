import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class ReturnItemDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiProperty({ enum: ['damaged', 'expired', 'defective', 'wrong_item', 'other'], example: 'damaged' })
  @IsEnum(['damaged', 'expired', 'defective', 'wrong_item', 'other'])
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseReturnDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  purchaseOrderId: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  items: ReturnItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseReturnDto {
  @ApiPropertyOptional({ enum: ['approved', 'rejected', 'settled'] })
  @IsOptional()
  @IsEnum(['approved', 'rejected', 'settled'])
  status?: 'approved' | 'rejected' | 'settled';

  @ApiPropertyOptional({ enum: ['replacement', 'credit_note', 'refund'] })
  @IsOptional()
  @IsEnum(['replacement', 'credit_note', 'refund'])
  settlementType?: 'replacement' | 'credit_note' | 'refund';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
