import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class ChangePinDto {
  @ApiProperty({ example: '1234', description: 'Current PIN' })
  @IsString()
  currentPin: string;

  @ApiProperty({ 
    example: '5678', 
    description: 'New PIN (4-6 digits)'
  })
  @IsString()
  @MinLength(4)
  @MaxLength(6)
  @Matches(/^\d+$/, {
    message: 'PIN must contain only digits',
  })
  newPin: string;
}

