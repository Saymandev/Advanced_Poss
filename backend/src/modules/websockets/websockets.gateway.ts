import { Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure for production
    credentials: true,
  },
  namespace: '/ws',
})
export class WebsocketsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');
  private rooms: Map<string, Set<string>> = new Map(); // branchId -> Set<socketId>

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from all rooms
    for (const [branchId, sockets] of this.rooms.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.rooms.delete(branchId);
      }
    }
  }

  @SubscribeMessage('join-branch')
  handleJoinBranch(
    @MessageBody() data: { branchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { branchId } = data;

    if (!this.rooms.has(branchId)) {
      this.rooms.set(branchId, new Set());
    }

    this.rooms.get(branchId).add(client.id);
    client.join(`branch:${branchId}`);

    this.logger.log(`Client ${client.id} joined branch ${branchId}`);

    return {
      success: true,
      message: `Joined branch ${branchId}`,
    };
  }

  @SubscribeMessage('leave-branch')
  handleLeaveBranch(
    @MessageBody() data: { branchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { branchId } = data;

    if (this.rooms.has(branchId)) {
      this.rooms.get(branchId).delete(client.id);
    }

    client.leave(`branch:${branchId}`);

    this.logger.log(`Client ${client.id} left branch ${branchId}`);

    return {
      success: true,
      message: `Left branch ${branchId}`,
    };
  }

  @SubscribeMessage('join-table')
  handleJoinTable(
    @MessageBody() data: { tableId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { tableId } = data;
    client.join(`table:${tableId}`);

    this.logger.log(`Client ${client.id} joined table ${tableId}`);

    return {
      success: true,
      message: `Joined table ${tableId}`,
    };
  }

  @SubscribeMessage('join-kitchen')
  handleJoinKitchen(
    @MessageBody() data: { branchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { branchId } = data;
    client.join(`kitchen:${branchId}`);

    this.logger.log(`Client ${client.id} joined kitchen ${branchId}`);

    return {
      success: true,
      message: `Joined kitchen ${branchId}`,
    };
  }

  // Emit events to specific rooms

  emitToClient(clientId: string, event: string, data: any) {
    this.server.to(clientId).emit(event, data);
  }

  emitToBranch(branchId: string, event: string, data: any) {
    this.server.to(`branch:${branchId}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to branch ${branchId}`);
  }

  emitToTable(tableId: string, event: string, data: any) {
    this.server.to(`table:${tableId}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to table ${tableId}`);
  }

  emitToKitchen(branchId: string, event: string, data: any) {
    this.server.to(`kitchen:${branchId}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to kitchen ${branchId}`);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`Emitted ${event} to all clients`);
  }

  // Order events

  notifyNewOrder(branchId: string, order: any) {
    this.emitToBranch(branchId, 'order:new', order);
    this.emitToKitchen(branchId, 'kitchen:new-order', order);

    if (order.tableId) {
      this.emitToTable(order.tableId, 'table:order-created', order);
    }
  }

  notifyOrderUpdated(branchId: string, order: any) {
    this.emitToBranch(branchId, 'order:updated', order);

    if (order.tableId) {
      this.emitToTable(order.tableId, 'table:order-updated', order);
    }
  }

  notifyOrderStatusChanged(branchId: string, order: any) {
    this.emitToBranch(branchId, 'order:status-changed', {
      orderId: order.id,
      status: order.status,
      order,
    });

    this.emitToKitchen(branchId, 'kitchen:order-status-changed', {
      orderId: order.id,
      status: order.status,
      order,
    });

    if (order.tableId) {
      this.emitToTable(order.tableId, 'table:order-status-changed', {
        orderId: order.id,
        status: order.status,
      });
    }
  }

  notifyOrderItemReady(branchId: string, orderId: string, itemId: string) {
    this.emitToBranch(branchId, 'order:item-ready', {
      orderId,
      itemId,
    });

    this.emitToKitchen(branchId, 'kitchen:item-ready', {
      orderId,
      itemId,
    });
  }

  notifyPaymentReceived(branchId: string, order: any, payment: any) {
    this.emitToBranch(branchId, 'order:payment-received', {
      orderId: order.id,
      payment,
      order,
    });

    if (order.tableId) {
      this.emitToTable(order.tableId, 'table:payment-received', {
        payment,
      });
    }
  }

  // Table events

  notifyTableStatusChanged(branchId: string, table: any) {
    this.emitToBranch(branchId, 'table:status-changed', {
      tableId: table.id,
      status: table.status,
      table,
    });

    this.emitToTable(table.id, 'table:status-changed', {
      status: table.status,
    });
  }

  notifyTableOccupied(branchId: string, table: any, order: any) {
    this.emitToBranch(branchId, 'table:occupied', {
      tableId: table.id,
      orderId: order.id,
      table,
      order,
    });
  }

  notifyTableAvailable(branchId: string, table: any) {
    this.emitToBranch(branchId, 'table:available', {
      tableId: table.id,
      table,
    });
  }

  notifyTableReserved(branchId: string, table: any, reservation: any) {
    this.emitToBranch(branchId, 'table:reserved', {
      tableId: table.id,
      reservation,
      table,
    });
  }

  // Inventory events

  notifyLowStock(branchId: string, ingredient: any) {
    this.emitToBranch(branchId, 'inventory:low-stock', {
      ingredientId: ingredient.id,
      name: ingredient.name,
      currentStock: ingredient.currentStock,
      minimumStock: ingredient.minimumStock,
      ingredient,
    });
  }

  notifyOutOfStock(branchId: string, ingredient: any) {
    this.emitToBranch(branchId, 'inventory:out-of-stock', {
      ingredientId: ingredient.id,
      name: ingredient.name,
      ingredient,
    });
  }

  notifyStockUpdated(branchId: string, ingredient: any) {
    this.emitToBranch(branchId, 'inventory:stock-updated', {
      ingredientId: ingredient.id,
      currentStock: ingredient.currentStock,
      ingredient,
    });
  }

  // Customer events

  notifyNewCustomer(branchId: string, customer: any) {
    this.emitToBranch(branchId, 'customer:new', customer);
  }

  notifyCustomerUpdated(branchId: string, customer: any) {
    this.emitToBranch(branchId, 'customer:updated', customer);
  }

  notifyLoyaltyPointsEarned(branchId: string, customer: any, points: number) {
    this.emitToBranch(branchId, 'customer:loyalty-points-earned', {
      customerId: customer.id,
      points,
      totalPoints: customer.loyaltyPoints,
      customer,
    });
  }

  // Kitchen Display events

  notifyKitchenOrderReceived(branchId: string, order: any) {
    this.emitToKitchen(branchId, 'kitchen:order-received', order);
  }

  notifyKitchenItemStarted(
    branchId: string,
    orderId: string,
    itemId: string,
  ) {
    this.emitToKitchen(branchId, 'kitchen:item-started', {
      orderId,
      itemId,
    });
  }

  notifyKitchenItemCompleted(
    branchId: string,
    orderId: string,
    itemId: string,
  ) {
    this.emitToKitchen(branchId, 'kitchen:item-completed', {
      orderId,
      itemId,
    });

    this.emitToBranch(branchId, 'order:item-completed', {
      orderId,
      itemId,
    });
  }

  // System events

  notifySystemAlert(branchId: string, alert: any) {
    this.emitToBranch(branchId, 'system:alert', alert);
  }

  notifySystemNotification(branchId: string, notification: any) {
    this.emitToBranch(branchId, 'system:notification', notification);
  }

  // Stats

  getConnectionStats() {
    const stats = {
      totalConnections: this.server.sockets.sockets.size,
      rooms: Array.from(this.rooms.entries()).map(([branchId, sockets]) => ({
        branchId,
        connections: sockets.size,
      })),
    };

    return stats;
  }
}

