import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class FindCompanyDto {
  @ApiProperty({
    example: 'company@example.com',
    description: 'Company or user email',
  })
  @IsEmail()
  email: string;
}

