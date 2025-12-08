import { IsOptional, IsString, IsDateString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WastageReason } from '../schemas/wastage.schema';

export class WastageQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  ingredientId?: string;

  @IsOptional()
  @IsEnum(WastageReason)
  reason?: WastageReason;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;
}

