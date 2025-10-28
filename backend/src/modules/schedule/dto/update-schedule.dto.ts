import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateScheduleDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @IsOptional()
  @IsEnum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
  status?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
