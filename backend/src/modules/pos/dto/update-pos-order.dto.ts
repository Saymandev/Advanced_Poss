import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreatePOSOrderDto } from './create-pos-order.dto';

export class UpdatePOSOrderDto extends PartialType(CreatePOSOrderDto) {
  @IsOptional()
  @IsEnum(['pending', 'paid', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

