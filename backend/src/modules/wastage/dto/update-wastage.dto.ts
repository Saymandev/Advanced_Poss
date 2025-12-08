import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CreateWastageDto } from './create-wastage.dto';

export class UpdateWastageDto extends PartialType(CreateWastageDto) {
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsDateString()
  approvedAt?: string | Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;
}

