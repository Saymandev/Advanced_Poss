import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsPhoneNumber, IsString, Length, Matches } from 'class-validator';

export enum CompanyType {
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  BAR = 'bar',
}

export enum SubscriptionPackage {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export class CompanyOwnerRegisterDto {
  // Company Information
  @ApiProperty({
    description: 'Company name',
    example: 'The Golden Fork Restaurant',
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  companyName: string;

  @ApiProperty({
    description: 'Company type',
    enum: CompanyType,
    example: CompanyType.RESTAURANT,
  })
  @IsNotEmpty()
  @IsEnum(CompanyType)
  companyType: CompanyType;

  @ApiProperty({
    description: 'Country where the company is located',
    example: 'United States',
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  country: string;

  @ApiProperty({
    description: 'Company email address',
    example: 'contact@goldenfork.com',
  })
  @IsNotEmpty()
  @IsEmail()
  companyEmail: string;

  // Branch Information
  @ApiProperty({
    description: 'Branch name',
    example: 'Downtown Branch',
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  branchName: string;

  @ApiProperty({
    description: 'Branch address',
    example: '123 Main Street, New York, NY 10001',
  })
  @IsNotEmpty()
  @IsString()
  @Length(10, 200)
  branchAddress: string;

  @ApiProperty({
    description: 'Subscription package',
    enum: SubscriptionPackage,
    example: SubscriptionPackage.BASIC,
  })
  @IsNotEmpty()
  @IsEnum(SubscriptionPackage)
  package: SubscriptionPackage;

  // Owner Information
  @ApiProperty({
    description: 'Owner first name',
    example: 'John',
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  firstName: string;

  @ApiProperty({
    description: 'Owner last name',
    example: 'Smith',
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  lastName: string;

  @ApiProperty({
    description: 'Owner phone number',
    example: '+1234567890',
  })
  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber: string;

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
}
