import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateQRCodeDto {
  @IsString()
  branchId: string;

  @IsOptional()
  @IsNumber()
  tableNumber?: number;

  @IsEnum(['full', 'food', 'drinks', 'desserts'])
  menuType: 'full' | 'food' | 'drinks' | 'desserts';
}

