import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { LoginMethod, LoginStatus } from '../schemas/login-activity.schema';
import { SessionStatus } from '../schemas/login-session.schema';

export class CreateLoginActivityDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  email: string;

  @IsString()
  role: string;

  @IsEnum(LoginStatus)
  status: LoginStatus;

  @IsEnum(LoginMethod)
  method: LoginMethod;

  @IsString()
  ipAddress: string;

  @IsString()
  userAgent: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsDateString()
  loginTime?: Date;
}

export class CreateLoginSessionDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  sessionId: string;

  @IsString()
  accessToken: string;

  @IsString()
  refreshToken: string;

  @IsString()
  ipAddress: string;

  @IsString()
  userAgent: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @IsDateString()
  loginTime: Date;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class UpdateSessionActivityDto {
  @IsOptional()
  @IsDateString()
  lastActivity?: Date;

  @IsOptional()
  @IsNumber()
  activityCount?: number;
}

export class TerminateSessionDto {
  @IsOptional()
  @IsString()
  terminatedBy?: string;

  @IsOptional()
  @IsString()
  terminationReason?: string;
}

export class LoginActivityFilterDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(LoginStatus)
  status?: LoginStatus;

  @IsOptional()
  @IsEnum(LoginMethod)
  method?: LoginMethod;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class SessionFilterDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
