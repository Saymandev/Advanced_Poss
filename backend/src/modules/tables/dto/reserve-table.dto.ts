import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ReserveTableDto {
  @ApiProperty({
    example: '2024-01-20T14:00:00Z',
    description: 'Reservation start time (ISO 8601)',
  })
  @IsDateString()
  reservedFor: string; // start time

  @ApiProperty({
    example: '2024-01-20T16:00:00Z',
    description: 'Reservation end time (ISO 8601)',
  })
  @IsDateString()
  reservedUntil: string; // end time

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

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Window seat preferred', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '65a... (ObjectId)', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ example: [{ menuItemId: '...', quantity: 1 }], required: false })
  @IsArray()
  @IsOptional()
  preOrderItems?: any[];
}
