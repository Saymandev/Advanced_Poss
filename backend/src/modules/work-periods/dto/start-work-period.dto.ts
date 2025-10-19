import { IsNumber, IsString, MinLength } from 'class-validator';

export class StartWorkPeriodDto {
  @IsNumber()
  openingBalance: number;

  @IsString()
  @MinLength(6, { message: 'PIN must be 6 digits' })
  pin: string;
}
