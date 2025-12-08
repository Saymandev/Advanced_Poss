import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCustomDomainDto {
  @ApiProperty({
    description: 'Verification token from DNS TXT record',
    example: 'domain-verification-abc123',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

