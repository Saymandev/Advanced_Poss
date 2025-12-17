import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateRoomStatusDto {
  @ApiProperty({
    example: 'available',
    enum: ['available', 'occupied', 'reserved', 'maintenance', 'out_of_order'],
  })
  @IsEnum(['available', 'occupied', 'reserved', 'maintenance', 'out_of_order'])
  @IsNotEmpty()
  status: string;
}

