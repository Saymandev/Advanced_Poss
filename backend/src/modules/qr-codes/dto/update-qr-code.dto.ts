import { IsBoolean, IsEnum, IsNumber, IsOptional } from 'class-validator';

export class UpdateQRCodeDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(['full', 'food', 'drinks', 'desserts'])
  menuType?: 'full' | 'food' | 'drinks' | 'desserts';

  @IsOptional()
  @IsNumber()
  scanCount?: number;

  @IsOptional()
  tableNumber?: number;
}

