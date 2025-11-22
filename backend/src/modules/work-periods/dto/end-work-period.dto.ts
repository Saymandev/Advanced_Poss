import { IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class EndWorkPeriodDto {
  @IsNumber()
  actualClosingBalance: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4-6 digits' })
  pin: string;
}
