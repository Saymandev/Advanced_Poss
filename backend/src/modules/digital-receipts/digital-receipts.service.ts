import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailService } from '../../common/services/email.service';
import { CustomersService } from '../customers/customers.service';
import { ReceiptService } from '../pos/receipt.service';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { CreateDigitalReceiptDto } from './dto/create-digital-receipt.dto';
import { DigitalReceiptFilterDto } from './dto/digital-receipt-filter.dto';
import { EmailDigitalReceiptDto } from './dto/email-digital-receipt.dto';
import { DigitalReceipt, DigitalReceiptDocument } from './schemas/digital-receipt.schema';

@Injectable()
export class DigitalReceiptsService {
  constructor(
    @InjectModel(DigitalReceipt.name)
    private digitalReceiptModel: Model<DigitalReceiptDocument>,
    @InjectModel(POSOrder.name)
    private posOrderModel: Model<POSOrderDocument>,
    private receiptService: ReceiptService,
    private customersService: CustomersService,
    private emailService: EmailService,
  ) {}

  async generateReceiptNumber(branchId: string): Promise<string> {
    const prefix = 'DR';
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find the last receipt for this branch today
    const todayStart = new Date(date.setHours(0, 0, 0, 0));
    const todayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const lastReceipt = await this.digitalReceiptModel
      .findOne({
        branchId: new Types.ObjectId(branchId),
        createdAt: { $gte: todayStart, $lte: todayEnd },
      })
      .sort({ createdAt: -1 })
      .exec();

    let sequence = 1;
    if (lastReceipt) {
      const lastNumber = lastReceipt.receiptNumber;
      const lastSequence = parseInt(lastNumber.slice(-4), 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    const sequenceStr = sequence.toString().padStart(4, '0');
    return `${prefix}-${dateStr}-${sequenceStr}`;
  }

  async create(
    createDto: CreateDigitalReceiptDto,
    companyId: string,
    branchId: string,
  ): Promise<DigitalReceipt> {
    // Validate orderId format
    if (!Types.ObjectId.isValid(createDto.orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const orderObjectId = new Types.ObjectId(createDto.orderId);

    // Check if receipt already exists for this order
    const existingReceipt = await this.digitalReceiptModel
      .findOne({ orderId: orderObjectId })
      .exec();

    if (existingReceipt) {
      throw new BadRequestException('Digital receipt already exists for this order');
    }

    // Get the order
    const order = await this.posOrderModel
      .findById(orderObjectId)
      .populate('tableId', 'number')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify order belongs to branch
    if (order.branchId.toString() !== branchId) {
      throw new BadRequestException('Order does not belong to this branch');
    }

    // Verify order is paid
    if (order.status !== 'paid') {
      throw new BadRequestException('Can only generate receipt for paid orders');
    }

    // Get receipt data from receipt service
    const receiptData = await this.receiptService.generateReceiptData(createDto.orderId);

    // Transform items to receipt format
    const receiptItems = receiptData.items.map((item: any) => ({
      name: item.name || 'Unknown Item',
      quantity: item.quantity || 0,
      price: item.price || 0,
      total: (item.quantity || 0) * (item.price || 0),
    }));

    // Calculate totals
    const subtotal = receiptData.subtotal || receiptData.totalAmount || 0;
    const tax = receiptData.taxAmount || 0;
    const tip = receiptData.tip || 0;
    const total = receiptData.totalAmount || subtotal + tax + tip;

    // Get customer info
    let customerId: Types.ObjectId | undefined;
    const customerEmail = createDto.customerEmail || order.customerInfo?.email;

    if (customerEmail) {
      try {
        const customer = await this.customersService.findByEmail(companyId, customerEmail);
        if (customer) {
          customerId = (customer as any)._id || (customer as any).id;
        }
      } catch (error) {
        // Customer not found, continue without customerId
      }
    }

    // Calculate loyalty points (1 point per dollar)
    let loyaltyPointsEarned = 0;
    let loyaltyPointsBalance = 0;
    if (customerId) {
      try {
        const customer = await this.customersService.findOne(customerId.toString());
        loyaltyPointsEarned = Math.floor(total);
        loyaltyPointsBalance = (customer.loyaltyPoints || 0) + loyaltyPointsEarned;
      } catch (error) {
        // Customer not found, skip loyalty points
      }
    }

    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber(branchId);

    // Create digital receipt
    const digitalReceipt = new this.digitalReceiptModel({
      receiptNumber,
      orderId: new Types.ObjectId(createDto.orderId),
      customerId: customerId ? new Types.ObjectId(customerId) : undefined,
      customerEmail,
      branchId: new Types.ObjectId(branchId),
      companyId: new Types.ObjectId(companyId),
      items: receiptItems,
      subtotal,
      tax,
      tip: tip > 0 ? tip : undefined,
      total,
      paymentMethod: order.paymentMethod || 'cash',
      loyaltyPointsEarned: loyaltyPointsEarned > 0 ? loyaltyPointsEarned : undefined,
      loyaltyPointsBalance: loyaltyPointsBalance > 0 ? loyaltyPointsBalance : undefined,
      personalizedOffers: [], // Can be populated later with AI/ML
      emailed: false,
    });

    return digitalReceipt.save();
  }

  async findAll(filterDto: DigitalReceiptFilterDto): Promise<DigitalReceipt[]> {
    const query: any = {};

    if (filterDto.branchId) {
      query.branchId = new Types.ObjectId(filterDto.branchId);
    }

    if (filterDto.customerId) {
      query.customerId = new Types.ObjectId(filterDto.customerId);
    }

    if (filterDto.startDate || filterDto.endDate) {
      query.createdAt = {};
      if (filterDto.startDate) {
        query.createdAt.$gte = new Date(filterDto.startDate);
      }
      if (filterDto.endDate) {
        const endDate = new Date(filterDto.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    return this.digitalReceiptModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('orderId', 'orderNumber totalAmount status')
      .populate('customerId', 'firstName lastName email')
      .exec();
  }

  async findOne(id: string): Promise<DigitalReceipt> {
    const receipt = await this.digitalReceiptModel
      .findById(id)
      .populate('orderId')
      .populate('customerId')
      .exec();

    if (!receipt) {
      throw new NotFoundException('Digital receipt not found');
    }

    return receipt;
  }

  async emailReceipt(
    receiptId: string,
    emailDto: EmailDigitalReceiptDto,
  ): Promise<{ success: boolean; message?: string }> {
    const receipt = await this.digitalReceiptModel.findById(receiptId).exec();

    if (!receipt) {
      throw new NotFoundException('Digital receipt not found');
    }

    // Generate receipt HTML
    let orderId: string;
    if (receipt.orderId instanceof Types.ObjectId) {
      orderId = receipt.orderId.toString();
    } else if (typeof receipt.orderId === 'object' && receipt.orderId !== null) {
      orderId = (receipt.orderId as any)._id?.toString() || (receipt.orderId as any).toString();
    } else {
      orderId = String(receipt.orderId);
    }

    const receiptHtml = await this.receiptService.generateReceiptHTML(orderId);

    // Send email with receipt
    const subject = `Receipt ${receipt.receiptNumber} - ${receipt.receiptNumber}`;
    const emailSent = await this.emailService.sendEmail(
      emailDto.email,
      subject,
      receiptHtml,
    );

    // Mark as emailed regardless of success (to track attempts)
    receipt.emailed = emailSent;
    receipt.emailedAt = new Date();
    receipt.emailedTo = emailDto.email;
    await receipt.save();

    if (emailSent) {
      return {
        success: true,
        message: `Receipt sent successfully to ${emailDto.email}`,
      };
    } else {
      return {
        success: false,
        message: `Failed to send receipt email. Please check email configuration.`,
      };
    }
  }
}

