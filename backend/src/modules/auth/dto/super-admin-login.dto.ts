import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SuperAdminLoginDto {
  @ApiProperty({
    description: 'Super admin email address',
    example: 'admin@restaurantpos.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Super admin password',
    example: 'Admin@123456',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
