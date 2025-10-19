import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ReserveTableDto {
  @ApiProperty({ example: '2024-01-20T19:00:00Z' })
  @IsDateString()
  reservedFor: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  partySize: number;
}

