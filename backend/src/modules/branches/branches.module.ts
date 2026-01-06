import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { CompaniesModule } from '../companies/companies.module';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { DeliveryZone, DeliveryZoneSchema } from '../delivery-zones/schemas/delivery-zone.schema';
import { DigitalReceipt, DigitalReceiptSchema } from '../digital-receipts/schemas/digital-receipt.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { Ingredient, IngredientSchema } from '../ingredients/schemas/ingredient.schema';
import { KitchenOrder, KitchenOrderSchema } from '../kitchen/schemas/kitchen-order.schema';
import { LoginActivity, LoginActivitySchema } from '../login-activity/schemas/login-activity.schema';
import { LoginSession, LoginSessionSchema } from '../login-activity/schemas/login-session.schema';
import { MarketingCampaign, MarketingCampaignSchema } from '../marketing/schemas/marketing-campaign.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { PaymentMethod, PaymentMethodSchema } from '../payment-methods/schemas/payment-method.schema';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { POSPayment, POSPaymentSchema } from '../pos/schemas/pos-payment.schema';
import { POSSettings, POSSettingsSchema } from '../pos/schemas/pos-settings.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../purchase-orders/schemas/purchase-order.schema';
import { QRCode, QRCodeSchema } from '../qr-codes/schemas/qr-code.schema';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { ScheduleShift, ScheduleShiftSchema } from '../schedule/schemas/schedule-shift.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Table, TableSchema } from '../tables/schemas/table.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Wastage, WastageSchema } from '../wastage/schemas/wastage.schema';
import { WorkPeriod, WorkPeriodSchema } from '../work-periods/schemas/work-period.schema';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { Branch, BranchSchema } from './schemas/branch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: Table.name, schema: TableSchema },
      { name: User.name, schema: UserSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: DeliveryZone.name, schema: DeliveryZoneSchema },
      { name: DigitalReceipt.name, schema: DigitalReceiptSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Ingredient.name, schema: IngredientSchema },
      { name: KitchenOrder.name, schema: KitchenOrderSchema },
      { name: LoginActivity.name, schema: LoginActivitySchema },
      { name: LoginSession.name, schema: LoginSessionSchema },
      { name: MarketingCampaign.name, schema: MarketingCampaignSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Order.name, schema: OrderSchema },
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
      { name: POSPayment.name, schema: POSPaymentSchema },
      { name: POSSettings.name, schema: POSSettingsSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: QRCode.name, schema: QRCodeSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Room.name, schema: RoomSchema },
      { name: ScheduleShift.name, schema: ScheduleShiftSchema },
      { name: Wastage.name, schema: WastageSchema },
      { name: WorkPeriod.name, schema: WorkPeriodSchema },
    ]),
    forwardRef(() => CompaniesModule),
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard (circular dependency)
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard (circular dependency)
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}

