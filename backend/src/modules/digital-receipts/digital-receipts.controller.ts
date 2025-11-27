import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateDigitalReceiptDto } from './dto/create-digital-receipt.dto';
import { DigitalReceiptFilterDto } from './dto/digital-receipt-filter.dto';
import { EmailDigitalReceiptDto } from './dto/email-digital-receipt.dto';
import { DigitalReceiptsService } from './digital-receipts.service';

@ApiTags('Digital Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('digital-receipts')
export class DigitalReceiptsController {
  constructor(private readonly digitalReceiptsService: DigitalReceiptsService) {}

  @Post('generate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Generate a digital receipt from an order' })
  async generate(
    @Body() createDto: CreateDigitalReceiptDto,
    @Request() req: any,
  ) {
    const companyId = req.user?.companyId || req.user?.company?._id;
    const branchId = req.user?.branchId || req.user?.branch?._id;

    if (!companyId || !branchId) {
      throw new Error('Company ID and Branch ID are required');
    }

    return this.digitalReceiptsService.create(createDto, companyId, branchId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get all digital receipts with filtering' })
  async findAll(@Query() filterDto: DigitalReceiptFilterDto) {
    return this.digitalReceiptsService.findAll(filterDto);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get a digital receipt by ID' })
  async findOne(@Param('id') id: string) {
    return this.digitalReceiptsService.findOne(id);
  }

  @Post(':id/email')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Email a digital receipt to a customer' })
  async emailReceipt(
    @Param('id') id: string,
    @Body() emailDto: EmailDigitalReceiptDto,
  ) {
    return this.digitalReceiptsService.emailReceipt(id, emailDto);
  }
}

