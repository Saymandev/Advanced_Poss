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
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { KitchenService } from './kitchen.service';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('branch/:branchId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
  )
  @ApiOperation({ summary: 'Get all kitchen orders for branch' })
  findAll(@Param('branchId') branchId: string, @Query('status') status?: string) {
    return this.kitchenService.findAll(branchId, status);
  }

  @Get('branch/:branchId/pending')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
  )
  @ApiOperation({ summary: 'Get pending orders' })
  findPending(@Param('branchId') branchId: string) {
    return this.kitchenService.findPending(branchId);
  }

  @Get('branch/:branchId/preparing')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
  )
  @ApiOperation({ summary: 'Get orders being prepared' })
  findPreparing(@Param('branchId') branchId: string) {
    return this.kitchenService.findPreparing(branchId);
  }

  @Get('branch/:branchId/ready')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
  )
  @ApiOperation({ summary: 'Get ready orders' })
  findReady(@Param('branchId') branchId: string) {
    return this.kitchenService.findReady(branchId);
  }

  @Get('branch/:branchId/delayed')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
  )
  @ApiOperation({ summary: 'Get delayed orders (> 30 min)' })
  findDelayed(@Param('branchId') branchId: string) {
    return this.kitchenService.findDelayed(branchId);
  }

  @Get('branch/:branchId/urgent')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
  )
  @ApiOperation({ summary: 'Get urgent orders' })
  findUrgent(@Param('branchId') branchId: string) {
    return this.kitchenService.findUrgent(branchId);
  }

  @Get('branch/:branchId/stats')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
  )
  @ApiOperation({ summary: 'Get kitchen statistics' })
  getStats(@Param('branchId') branchId: string) {
    return this.kitchenService.getStats(branchId);
  }

  @Get('order/:orderId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
  )
  @ApiOperation({ summary: 'Get kitchen order by order ID' })
  findByOrderId(@Param('orderId') orderId: string) {
    return this.kitchenService.findByOrderId(orderId);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.CHEF,
  )
  @ApiOperation({ summary: 'Get kitchen order by ID' })
  findOne(@Param('id') id: string) {
    return this.kitchenService.findOne(id);
  }

  @Post(':id/start')
  @Roles(UserRole.CHEF, UserRole.MANAGER)
  @ApiOperation({ summary: 'Start preparing order' })
  startOrder(@Param('id') id: string, @Body('chefId') chefId: string) {
    return this.kitchenService.startOrder(id, chefId);
  }

  @Post(':id/items/:itemId/start')
  @Roles(UserRole.CHEF, UserRole.MANAGER)
  @ApiOperation({ summary: 'Start preparing specific item' })
  startItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('chefId') chefId: string,
  ) {
    return this.kitchenService.startItem(id, itemId, chefId);
  }

  @Post(':id/items/:itemId/complete')
  @Roles(UserRole.CHEF, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mark item as ready' })
  completeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.kitchenService.completeItem(id, itemId);
  }

  @Post(':id/complete')
  @Roles(UserRole.CHEF, UserRole.MANAGER, UserRole.WAITER)
  @ApiOperation({ summary: 'Mark entire order as served' })
  completeOrder(@Param('id') id: string) {
    return this.kitchenService.completeOrder(id);
  }

  @Patch(':id/urgent')
  @Roles(UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Mark order as urgent' })
  markUrgent(@Param('id') id: string, @Body('isUrgent') isUrgent: boolean) {
    return this.kitchenService.markUrgent(id, isUrgent);
  }

  @Patch(':id/items/:itemId/priority')
  @Roles(UserRole.CHEF, UserRole.MANAGER)
  @ApiOperation({ summary: 'Set item priority' })
  setPriority(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('priority') priority: number,
  ) {
    return this.kitchenService.setPriority(id, itemId, priority);
  }

  @Post(':id/cancel')
  @Roles(UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Cancel kitchen order' })
  cancelOrder(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.kitchenService.cancelOrder(id, reason);
  }
}

