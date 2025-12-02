import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class PinLoginWithRoleDto {
  @ApiProperty({
    description: 'Company ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  companyId: string;

  @ApiProperty({
    description: 'Branch ID',
    example: '507f1f77bcf86cd799439013',
  })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  branchId: string;

  @ApiProperty({
    description: 'User role in this company/branch',
    example: 'waiter',
  })
  @IsNotEmpty()
  @IsString()
  role: string;

  @ApiProperty({
    description: 'PIN for authentication (4-6 digits)',
    example: '1234',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4,6}$/, {
    message: 'PIN must be 4-6 digits',
  })
  pin: string;

  @ApiPropertyOptional({
    description: 'User ID - Required when multiple users exist with the same role',
    example: '507f1f77bcf86cd799439010',
  })
  @IsOptional()
  @IsString()
  @IsMongoId()
  userId?: string;
}
