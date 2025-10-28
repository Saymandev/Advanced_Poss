import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export interface ShiftTime {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export class CreateScheduleDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  branchId: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsEnum(['morning', 'afternoon', 'evening', 'night', 'custom'])
  shiftType: string;

  @IsNotEmpty()
  time: ShiftTime;

  @IsNotEmpty()
  @IsString()
  position: string;

  @IsOptional()
  @IsEnum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
  status?: string = 'scheduled';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  hoursWorked?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(480) // 8 hours in minutes
  breakDuration?: number;

  @IsOptional()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  location?: {
    name: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}
