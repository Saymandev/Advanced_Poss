import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class PinLoginDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'PIN must be 6 digits' })
  pin: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  branchId: string;
}

