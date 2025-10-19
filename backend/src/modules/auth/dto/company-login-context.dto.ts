import { ApiProperty } from '@nestjs/swagger';

export class CompanyLoginContextDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Company ID'
  })
  companyId: string;

  @ApiProperty({
    example: 'Restaurant ABC',
    description: 'Company name'
  })
  companyName: string;

  @ApiProperty({
    example: 'restaurant-abc',
    description: 'Company slug'
  })
  companySlug: string;

  @ApiProperty({
    example: 'https://restaurant-abc.com/logo.png',
    description: 'Company logo URL'
  })
  logoUrl?: string;

  @ApiProperty({
    example: [
      {
        id: '507f1f77bcf86cd799439011',
        name: 'Main Branch',
        address: '123 Main St, City',
        isActive: true
      },
      {
        id: '507f1f77bcf86cd799439013',
        name: 'Downtown Branch',
        address: '456 Downtown Ave, City',
        isActive: true
      }
    ],
    description: 'Available branches for this company'
  })
  branches: Array<{
    id: string;
    name: string;
    address: string;
    isActive: boolean;
  }>;

  @ApiProperty({
    example: 'Please select a branch and enter your PIN to continue',
    description: 'Message for the user'
  })
  message: string;
}
