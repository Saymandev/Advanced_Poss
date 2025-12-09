import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateContactFormDto {
  @ApiPropertyOptional({
    description: 'Status of the contact form',
    enum: ['new', 'read', 'replied', 'archived'],
    example: 'read',
  })
  @IsOptional()
  @IsEnum(['new', 'read', 'replied', 'archived'], {
    message: 'Status must be one of: new, read, replied, archived',
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Admin notes about this contact form',
    example: 'Customer called and issue resolved',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

