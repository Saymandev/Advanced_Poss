import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { PurchaseOrderFilterDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionFeatureGuard } from '../../common/guards/subscription-feature.guard';
import { ApprovePurchaseOrderDto } from './dto/approve-purchase-order.dto';
import { CancelPurchaseOrderDto } from './dto/cancel-purchase-order.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionFeatureGuard)
@RequiresFeature(FEATURES.PURCHASE_ORDERS)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) { }

  @Post()
  @ApiOperation({ summary: 'Create purchase order' })
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser('role') userRole?: string,
  ) {
    return this.purchaseOrdersService.create(dto, userRole);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase orders with pagination' })
  findAll(@Query() filterDto: PurchaseOrderFilterDto) {
    return this.purchaseOrdersService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update purchase order' })
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(id, dto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve purchase order' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.approve(id, dto);
  }

  @Patch(':id/receive')
  @ApiOperation({ summary: 'Receive purchase order' })
  receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.receive(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel purchase order' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelPurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.cancel(id, dto);
  }
}


