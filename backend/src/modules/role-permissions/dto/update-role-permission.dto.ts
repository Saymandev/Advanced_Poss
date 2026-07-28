import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsString } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class UpdateRolePermissionDto {
  @ApiProperty({
    example: 'waiter',
    enum: UserRole,
    description: 'Role to update permissions for',
  })
  @IsEnum(UserRole)
  role: string;

  @ApiProperty({
    example: ['dashboard', 'order-management', 'table-management'],
    description: 'Array of feature IDs to grant access to',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  features: string[];
}

