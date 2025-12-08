import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCustomDomainDto {
  @ApiProperty({
    description: 'Custom domain name (e.g., app.example.com)',
    example: 'app.example.com',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, {
    message: 'Invalid domain format. Use format like: app.example.com',
  })
  domain: string;
}

