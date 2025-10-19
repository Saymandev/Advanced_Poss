import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class PinLoginDto {
  @ApiProperty({ 
    example: '123456',
    description: '6-digit PIN for authentication'
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'PIN must be 6 digits' })
  pin: string;

  @ApiProperty({ 
    example: '507f1f77bcf86cd799439011',
    description: 'Branch ID (required for POS login)'
  })
  @IsString()
  branchId: string;

  @ApiProperty({ 
    example: '507f1f77bcf86cd799439012',
    description: 'Company ID (optional - can be derived from branch)'
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}

