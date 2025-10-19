import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class EndWorkPeriodDto {
  @IsNumber()
  actualClosingBalance: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  @MinLength(6, { message: 'PIN must be 6 digits' })
  pin: string;
}
