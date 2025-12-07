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
  private userRooms: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>
  private roleRooms: Map<string, Set<string>> = new Map(); // role -> Set<socketId>
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId
  private socketToRole: Map<string, string> = new Map(); // socketId -> role

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Extract user ID from handshake auth if available
    const userId = (client.handshake.auth as any)?.userId || (client.handshake.query as any)?.userId;
    if (userId) {
      this.socketToUser.set(client.id, userId);
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId).add(client.id);
      client.join(`user:${userId}`);
      this.logger.log(`Client ${client.id} associated with user ${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from all branch rooms
    for (const [branchId, sockets] of this.rooms.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.rooms.delete(branchId);
      }
    }

    // Remove from user room
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      const userSockets = this.userRooms.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userRooms.delete(userId);
        }
      }
      this.socketToUser.delete(client.id);
      client.leave(`user:${userId}`);
    }

    // Remove from role room
    const role = this.socketToRole.get(client.id);
    if (role) {
      const sockets = this.roleRooms.get(role);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.roleRooms.delete(role);
        }
      }
      this.socketToRole.delete(client.id);
      client.leave(`role:${role}`);
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

  @SubscribeMessage('join-role')
  handleJoinRole(
    @MessageBody() data: { role: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { role } = data;
    if (!role) {
      return { success: false, message: 'Role is required' };
    }

    const normalizedRole = role.toLowerCase();

    if (!this.roleRooms.has(normalizedRole)) {
      this.roleRooms.set(normalizedRole, new Set());
    }

    this.roleRooms.get(normalizedRole).add(client.id);
    this.socketToRole.set(client.id, normalizedRole);
    client.join(`role:${normalizedRole}`);

    this.logger.log(`Client ${client.id} joined role ${normalizedRole}`);

    return {
      success: true,
      message: `Joined role ${normalizedRole}`,
    };
  }

  broadcastToRole(role: string, event: string, payload: any) {
    const normalizedRole = role.toLowerCase();
    this.server.to(`role:${normalizedRole}`).emit(event, payload);
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

  @SubscribeMessage('join-user')
  handleJoinUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;
    client.join(`user:${userId}`);
    
    // Track user room
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(client.id);
    this.socketToUser.set(client.id, userId);

    this.logger.log(`Client ${client.id} joined user room ${userId}`);

    return {
      success: true,
      message: `Joined user room ${userId}`,
    };
  }

  @SubscribeMessage('join-order')
  handleJoinOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId } = data;
    const orderRoom = `order:${orderId}`;
    client.join(orderRoom);

    this.logger.log(`Client ${client.id} joined order room ${orderId} (public tracking)`);

    return {
      success: true,
      message: `Joined order room ${orderId}`,
    };
  }

  @SubscribeMessage('leave-order')
  handleLeaveOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { orderId } = data;
    const orderRoom = `order:${orderId}`;
    client.leave(orderRoom);

    this.logger.log(`Client ${client.id} left order room ${orderId}`);

    return {
      success: true,
      message: `Left order room ${orderId}`,
    };
  }

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any) {
    const userRoom = `user:${userId}`;
    
    // Safely check socket count using our manual tracking or adapter if available
    let socketCount = 0;
    try {
      // First try to use our manual tracking
      const userSocketIds = this.userRooms.get(userId);
      socketCount = userSocketIds ? userSocketIds.size : 0;
      
      // Fallback to adapter if manual tracking is empty but adapter is available
      if (socketCount === 0 && this.server?.sockets?.adapter?.rooms) {
        const socketsInRoom = this.server.sockets.adapter.rooms.get(userRoom);
        socketCount = socketsInRoom ? socketsInRoom.size : 0;
      }
    } catch (error) {
      // If adapter access fails, just use manual tracking
      const userSocketIds = this.userRooms.get(userId);
      socketCount = userSocketIds ? userSocketIds.size : 0;
    }
    
    console.log(`📡 [WebSocket] Emitting ${event} to room: ${userRoom}`);
    console.log(`📡 [WebSocket] Sockets in room: ${socketCount}`);
    
    // Always emit the event - Socket.IO will handle delivery
    this.server.to(userRoom).emit(event, data);
    this.logger.log(`📬 Emitted ${event} to user ${userId} (${socketCount} socket(s) in room)`);
    
    if (socketCount === 0) {
      console.warn(`⚠️ [WebSocket] No sockets found in room ${userRoom} - waiter may not be connected!`);
    }
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
    console.log(`📦 [WebSocket] notifyNewOrder called for order ${order.orderNumber || 'N/A'}, waiterId: ${order.waiterId || 'NONE'}`);
    
    this.emitToBranch(branchId, 'order:new', order);
    this.emitToKitchen(branchId, 'kitchen:new-order', order);

    if (order.tableId) {
      this.emitToTable(order.tableId, 'table:order-created', order);
    }

    // Notify specific waiter if assigned
    if (order.waiterId) {
      const waiterIdStr = typeof order.waiterId === 'string' ? order.waiterId : String(order.waiterId);
      console.log(`🔔 [WebSocket] Order has waiterId: ${waiterIdStr}, notifying waiter for order ${order.orderNumber || 'N/A'}...`);
      this.notifyWaiterAssigned(waiterIdStr, order);
    } else {
      console.log(`⚠️ [WebSocket] Order ${order.orderNumber || 'N/A'} has no waiterId - skipping waiter notification`);
      console.log(`⚠️ [WebSocket] Order keys: ${Object.keys(order).join(', ')}`);
    }
  }

  notifyWaiterAssigned(waiterId: string | any, order: any) {
    // Ensure waiterId is a string (convert ObjectId if needed)
    let waiterIdStr: string;
    if (typeof waiterId === 'string') {
      waiterIdStr = waiterId;
    } else if (waiterId && typeof waiterId.toString === 'function') {
      waiterIdStr = waiterId.toString();
    } else {
      waiterIdStr = String(waiterId || '');
    }
    
    // Extract tableNumber from tableId if populated
    let tableNumber: string | undefined;
    if (order.tableId) {
      if (typeof order.tableId === 'object' && order.tableId !== null) {
        // If tableId is populated (object), extract tableNumber
        tableNumber = (order.tableId as any).tableNumber || (order.tableId as any).number || undefined;
      } else if (typeof order.tableId === 'string') {
        // If tableId is just an ID string, we can't get tableNumber here
        tableNumber = undefined;
      }
    }
    
    const notificationData = {
      orderId: order.id || (order._id ? String(order._id) : null),
      orderNumber: order.orderNumber,
      tableNumber: tableNumber || order.tableNumber || undefined,
      tableId: typeof order.tableId === 'string' ? order.tableId : (order.tableId?._id || order.tableId?.id || undefined),
      orderType: order.orderType || order.type,
      totalAmount: order.totalAmount || order.total,
      items: order.items || [],
      notes: order.notes || order.customerNotes || '',
      timestamp: new Date(),
      order: order,
    };

    console.log(`📬 [WebSocket] Emitting order:assigned to user room: user:${waiterIdStr}`);
    console.log(`📬 [WebSocket] Notification data:`, JSON.stringify(notificationData, null, 2));
    
    console.log(`📬 [WebSocket] About to emit order:assigned to waiter ${waiterIdStr}`);
    console.log(`📬 [WebSocket] Order details: #${order.orderNumber || 'N/A'}, Table: ${order.tableNumber || 'N/A'}, Items: ${order.items?.length || 0}`);
    
    this.emitToUser(waiterIdStr, 'order:assigned', notificationData);
    
    this.logger.log(`📬 Notified waiter ${waiterIdStr} about assigned order ${order.orderNumber || 'N/A'}`);
    console.log(`✅ [WebSocket] Notification sent to waiter ${waiterIdStr} for order ${order.orderNumber || 'N/A'}`);
  }

  notifyOrderUpdated(branchId: string, order: any) {
    this.emitToBranch(branchId, 'order:updated', order);

    if (order.tableId) {
      this.emitToTable(order.tableId, 'table:order-updated', order);
    }
  }

  notifyOrderStatusChanged(branchId: string, order: any) {
    const orderId = order.id || order._id?.toString() || order.orderNumber;
    
    // Emit to branch room (for authenticated users)
    this.emitToBranch(branchId, 'order:status-changed', {
      orderId,
      status: order.status,
      order,
    });

    // Emit to kitchen room
    this.emitToKitchen(branchId, 'kitchen:order-status-changed', {
      orderId,
      status: order.status,
      order,
    });

    // Emit to table room if applicable
    if (order.tableId) {
      this.emitToTable(order.tableId, 'table:order-status-changed', {
        orderId,
        status: order.status,
      });
    }

    // Emit to order-specific room for public tracking (no auth required)
    if (orderId) {
      const orderRoom = `order:${orderId}`;
      this.server.to(orderRoom).emit('order:status-changed', {
        orderId,
        status: order.status,
        order,
      });
      this.logger.debug(`📡 Emitted order status change to order room: ${orderRoom}`);
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
      // Include order object in table:payment-received so frontend can access tableId
      this.emitToTable(order.tableId, 'table:payment-received', {
        payment,
        order, // Include order object for consistency
        orderId: order.id || order._id?.toString(),
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


