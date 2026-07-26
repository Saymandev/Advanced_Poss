import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailService } from '../../common/services/email.service';
import { SmsService } from '../../common/services/sms.service';
import { CustomersService } from '../customers/customers.service';
import { ReceiptService } from '../pos/receipt.service';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { CreateDigitalReceiptDto } from './dto/create-digital-receipt.dto';
import { DigitalReceiptFilterDto } from './dto/digital-receipt-filter.dto';
import { EmailDigitalReceiptDto } from './dto/email-digital-receipt.dto';
import { SmsDigitalReceiptDto } from './dto/sms-digital-receipt.dto';
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
    private smsService: SmsService,
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
    let customerPhone = order.customerInfo?.phone;

    if (customerEmail || customerPhone) {
      try {
        const customer = await this.customersService.findByEmail(companyId, customerEmail || '');
        if (customer) {
          customerId = (customer as any)._id || (customer as any).id;
          if (!customerPhone && (customer as any).phone) {
            customerPhone = (customer as any).phone;
          }
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
      customerPhone,
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

    const receiptData = await this.receiptService.generateReceiptData(orderId);
    const receiptHtml = await this.receiptService.generateReceiptHTML(orderId);

    const companyName = receiptData.restaurantName || 'Raha POS';
    const logoUrl = receiptData.receiptSettings?.logoUrl;
    const publicUrl = receiptData.publicUrl;

    const subject = `Receipt ${receipt.receiptNumber} from ${companyName}`;
    
    // Wrap the raw POS receipt in a proper email layout with logo and public portal link
    const emailHtmlTemplate = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 80px; margin-bottom: 20px; object-fit: contain;" />` : `<h2 style="color: #111827; margin-bottom: 20px;">${companyName}</h2>`}
          
          <p style="color: #4b5563; margin-bottom: 30px;">Thank you for your visit! Here is your digital receipt.</p>
          
          <div style="display: inline-block; text-align: left; background: white; padding: 15px; border: 1px dashed #d1d5db; border-radius: 8px; margin-bottom: 30px; width: 100%; max-width: 400px; box-sizing: border-box;">
            ${receiptHtml}
          </div>

          ${publicUrl ? `
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
            <p style="color: #4b5563; margin-bottom: 15px; font-weight: 500;">Want to order again?</p>
            <a href="${publicUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; text-transform: uppercase; font-size: 14px; letter-spacing: 0.5px;">Order from our Public Portal</a>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    const emailSent = await this.emailService.sendEmail(
      emailDto.email,
      subject,
      emailHtmlTemplate,
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

  async smsReceipt(
    receiptId: string,
    smsDto: SmsDigitalReceiptDto,
  ): Promise<{ success: boolean; message?: string }> {
    const receipt = await this.digitalReceiptModel.findById(receiptId).exec();

    if (!receipt) {
      throw new NotFoundException('Digital receipt not found');
    }

    // Fetch receipt data for company info and public URL
    let orderId: string;
    if (receipt.orderId instanceof Types.ObjectId) {
      orderId = receipt.orderId.toString();
    } else if (typeof receipt.orderId === 'object' && receipt.orderId !== null) {
      orderId = (receipt.orderId as any)._id?.toString() || (receipt.orderId as any).toString();
    } else {
      orderId = String(receipt.orderId);
    }
    
    let companyName = 'Raha POS';
    let publicUrl = null;
    try {
      const receiptData = await this.receiptService.generateReceiptData(orderId);
      companyName = receiptData.restaurantName || companyName;
      publicUrl = receiptData.publicUrl;
    } catch (e) {
      console.warn('Could not fetch full receipt data for SMS, using defaults');
    }

    // Format SMS message
    const orderDate = new Date((receipt as any).createdAt).toLocaleDateString('en-GB');
    let message = `${companyName} Receipt
Order #${receipt.receiptNumber}
Items: ${receipt.items.length}
Total: ৳${receipt.total.toFixed(2)}
Date: ${orderDate}
Thank you for your visit!`;

    if (publicUrl) {
      message += `\nOrder again: ${publicUrl}`;
    }

    // Send SMS
    const smsSent = await this.smsService.sendSms(
      smsDto.phone,
      message,
    );

    // Mark as smsed regardless of success (to track attempts)
    receipt.smsed = smsSent;
    receipt.smsedAt = new Date();
    receipt.smsedTo = smsDto.phone;
    await receipt.save();

    if (smsSent) {
      return {
        success: true,
        message: `Receipt sent successfully via SMS to ${smsDto.phone}`,
      };
    } else {
      return {
        success: false,
        message: `Failed to send receipt SMS. Please check SMS configuration.`,
      };
    }
  }
}

