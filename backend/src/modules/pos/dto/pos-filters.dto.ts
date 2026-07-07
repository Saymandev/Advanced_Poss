import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class POSOrderFiltersDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsIn(['pending', 'paid', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(['dine-in', 'delivery', 'takeaway', 'room_service', 'counter_sale'])
  orderType?: 'dine-in' | 'delivery' | 'takeaway' | 'room_service' | 'counter_sale';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number = 20;
}

export class POSStatsFiltersDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsIn(['dine-in', 'delivery', 'takeaway', 'room_service', 'counter_sale'])
  orderType?: 'dine-in' | 'delivery' | 'takeaway' | 'room_service' | 'counter_sale';
}

