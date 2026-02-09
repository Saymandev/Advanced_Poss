import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FEATURES } from '../../common/constants/features.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { KitchenService } from './kitchen.service';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) { }

  @Get('branch/:branchId')
  @Get('branch/:branchId')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Get all kitchen orders for branch' })
  findAll(@Param('branchId') branchId: string, @Query('status') status?: string) {
    return this.kitchenService.findAll(branchId, status);
  }

  @Get('branch/:branchId/pending')
  @Get('branch/:branchId/pending')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Get pending orders' })
  findPending(@Param('branchId') branchId: string) {
    return this.kitchenService.findPending(branchId);
  }

  @Get('branch/:branchId/preparing')
  @Get('branch/:branchId/preparing')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Get orders being prepared' })
  findPreparing(@Param('branchId') branchId: string) {
    return this.kitchenService.findPreparing(branchId);
  }

  @Get('branch/:branchId/ready')
  @Get('branch/:branchId/ready')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Get ready orders' })
  findReady(@Param('branchId') branchId: string) {
    return this.kitchenService.findReady(branchId);
  }

  @Get('branch/:branchId/delayed')
  @Get('branch/:branchId/delayed')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Get delayed orders (> 30 min)' })
  findDelayed(@Param('branchId') branchId: string) {
    return this.kitchenService.findDelayed(branchId);
  }

  @Get('branch/:branchId/urgent')
  @Get('branch/:branchId/urgent')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Get urgent orders' })
  findUrgent(@Param('branchId') branchId: string) {
    return this.kitchenService.findUrgent(branchId);
  }

  @Get('branch/:branchId/stats')
  @Get('branch/:branchId/stats')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Get kitchen statistics' })
  getStats(@Param('branchId') branchId: string) {
    return this.kitchenService.getStats(branchId);
  }

  @Get('order/:orderId')
  @Get('order/:orderId')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Get kitchen order by order ID' })
  findByOrderId(@Param('orderId') orderId: string) {
    return this.kitchenService.findByOrderId(orderId);
  }

  @Get(':id')
  @Get(':id')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Get kitchen order by ID' })
  findOne(@Param('id') id: string) {
    return this.kitchenService.findOne(id);
  }

  @Post(':id/start')
  @Post(':id/start')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Start preparing order' })
  startOrder(@Param('id') id: string, @Body('chefId') chefId: string) {
    return this.kitchenService.startOrder(id, chefId);
  }

  @Post(':id/items/:itemId/start')
  @Post(':id/items/:itemId/start')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Start preparing specific item' })
  startItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('chefId') chefId: string,
  ) {
    return this.kitchenService.startItem(id, itemId, chefId);
  }

  @Post(':id/items/:itemId/complete')
  @Post(':id/items/:itemId/complete')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Mark item as ready' })
  completeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.kitchenService.completeItem(id, itemId);
  }

  @Post(':id/complete')
  @Post(':id/complete')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Mark entire order as served' })
  completeOrder(@Param('id') id: string) {
    return this.kitchenService.completeOrder(id);
  }

  @Patch(':id/urgent')
  @Patch(':id/urgent')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Mark order as urgent' })
  markUrgent(@Param('id') id: string, @Body('isUrgent') isUrgent: boolean, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Managers and Owners can mark orders as urgent');
    }
    return this.kitchenService.markUrgent(id, isUrgent);
  }

  @Patch(':id/items/:itemId/priority')
  @Patch(':id/items/:itemId/priority')
  @RequiresFeature(FEATURES.KITCHEN_DISPLAY)
  @ApiOperation({ summary: 'Set item priority' })
  setPriority(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('priority') priority: number,
  ) {
    return this.kitchenService.setPriority(id, itemId, priority);
  }

  @Post(':id/cancel')
  @Post(':id/cancel')
  @RequiresFeature(FEATURES.ORDER_MANAGEMENT)
  @ApiOperation({ summary: 'Cancel kitchen order' })
  cancelOrder(@Param('id') id: string, @Body('reason') reason?: string, @CurrentUser() user?: any) {
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only Managers and Owners can cancel kitchen orders');
    }
    return this.kitchenService.cancelOrder(id, reason);
  }
}

