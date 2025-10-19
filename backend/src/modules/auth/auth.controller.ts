import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompanyOwnerRegisterDto } from './dto/company-owner-register.dto';
import { FindCompanyDto } from './dto/find-company.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { PinLoginWithRoleDto } from './dto/pin-login-with-role.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new company owner with company, branch, and owner information' })
  @ApiResponse({ 
    status: 201, 
    description: 'Company owner registered successfully',
    schema: {
      example: {
        user: {
          id: '507f1f77bcf86cd799439010',
          email: 'contact@goldenfork.com',
          firstName: 'John',
          lastName: 'Smith',
          role: 'owner',
          companyId: '507f1f77bcf86cd799439012',
          branchId: '507f1f77bcf86cd799439013'
        },
        company: {
          id: '507f1f77bcf86cd799439012',
          name: 'The Golden Fork Restaurant',
          type: 'restaurant',
          email: 'contact@goldenfork.com'
        },
        branch: {
          id: '507f1f77bcf86cd799439013',
          name: 'Downtown Branch',
          address: {
            street: '123 Main Street',
            city: 'New York',
            state: 'NY',
            country: 'United States',
            zipCode: '10001'
          }
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Company with this email already exists' })
  register(@Body() registerDto: CompanyOwnerRegisterDto) {
    return this.authService.registerCompanyOwner(registerDto);
  }

  @Public()
  @Post('register/user')
  @ApiOperation({ summary: 'Register new user (legacy endpoint)' })
  registerUser(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('find-company')
  @ApiOperation({ summary: 'Find company by email or company ID - Step 1 of authentication' })
  @ApiResponse({ 
    status: 200, 
    description: 'Company found successfully',
    schema: {
      example: {
        found: true,
        companyId: '507f1f77bcf86cd799439012',
        companyName: 'Restaurant ABC',
        companySlug: 'restaurant-abc',
        logoUrl: 'https://example.com/logo.png',
        branches: [
          {
            id: '507f1f77bcf86cd799439011',
            name: 'Main Branch',
            address: '123 Main St, City',
            isActive: true,
            availableRoles: ['owner', 'manager', 'waiter', 'chef', 'cashier']
          }
        ],
        message: 'Please select a branch, role, and enter your PIN to continue'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Company not found or invalid input' })
  findCompany(@Body() findCompanyDto: FindCompanyDto) {
    return this.authService.findCompany(findCompanyDto.email, findCompanyDto.companyId);
  }

  @Public()
  @Post('login/pin')
  @ApiOperation({ summary: 'Login with PIN - Step 2 of authentication (requires company context)' })
  loginWithPin(@Body() pinLoginDto: PinLoginDto) {
    return this.authService.loginWithPin(pinLoginDto);
  }

  @Public()
  @Post('login/pin-with-role')
  @ApiOperation({ summary: 'Login with PIN and role context - Enhanced authentication flow' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      example: {
        user: {
          id: '507f1f77bcf86cd799439010',
          email: 'user@restaurant.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'waiter',
          companyId: '507f1f77bcf86cd799439012',
          branchId: '507f1f77bcf86cd799439011'
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid PIN or role not found' })
  @ApiResponse({ status: 400, description: 'Account locked or deactivated' })
  pinLoginWithRole(@Body() pinLoginDto: PinLoginWithRoleDto) {
    return this.authService.pinLoginWithRole(pinLoginDto);
  }

  @Public()
  @Post('login/super-admin')
  @ApiOperation({ summary: 'Super admin login with email and password' })
  @ApiResponse({ 
    status: 200, 
    description: 'Super admin login successful',
    schema: {
      example: {
        user: {
          id: '507f1f77bcf86cd799439015',
          email: 'admin@restaurantpos.com',
          firstName: 'Super',
          lastName: 'Admin',
          role: 'super_admin',
          companyId: null,
          branchId: null,
          isSuperAdmin: true
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or access denied' })
  @ApiResponse({ status: 400, description: 'Account locked' })
  superAdminLogin(@Body() superAdminLoginDto: SuperAdminLoginDto) {
    return this.authService.superAdminLogin(superAdminLoginDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Legacy email/password login (deprecated - use find-company + login/pin flow)' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Public()
  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email with token' })
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: 'Change password (authenticated)' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }
}

