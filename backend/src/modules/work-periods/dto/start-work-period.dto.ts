import { IsNumber, IsString, Matches } from 'class-validator';

export class StartWorkPeriodDto {
  @IsNumber()
  openingBalance: number;

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4-6 digits' })
  pin: string;
}
