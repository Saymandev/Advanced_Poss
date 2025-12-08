import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  IsArray,
} from 'class-validator';
import { WastageReason } from '../schemas/wastage.schema';

export class CreateWastageDto {
  @IsNotEmpty()
  @IsString()
  ingredientId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNotEmpty()
  @IsString()
  unit: string;

  @IsNotEmpty()
  @IsEnum(WastageReason)
  reason: WastageReason;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsNotEmpty()
  @IsDateString()
  wastageDate: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

