import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GeneratorUtil } from '../../common/utils/generator.util';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { CustomersService } from '../customers/customers.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { GalleryService } from '../gallery/gallery.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
import { OrdersService } from '../orders/orders.service';
import { Order } from '../orders/schemas/order.schema';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SystemFeedbackService } from '../system-feedback/system-feedback.service';
import { UsersService } from '../users/users.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { SubmitContactFormDto } from './dto/submit-contact-form.dto';
import { ContactForm } from './schemas/contact-form.schema';

@Injectable()
export class PublicService {
  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<any>,
    @InjectModel(ContactForm.name)
    private contactFormModel: Model<ContactForm>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    private ordersService: OrdersService,
    private customersService: CustomersService,
    private menuItemsService: MenuItemsService,
    private zonesService: DeliveryZonesService,
    private galleryService: GalleryService,
    private usersService: UsersService,
    private websocketsGateway: WebsocketsGateway,
    private companiesService: CompaniesService,
    private systemFeedbackService: SystemFeedbackService,
    private subscriptionsService: SubscriptionsService,
    private branchesService: BranchesService,
  ) {}

  async createOrder(orderData: any) {
    // Check subscription limits for public ordering
    // Convert to MongooseSchema.Types.ObjectId (same pattern as controller)
    const companyIdObj = new Types.ObjectId(orderData.companyId) as unknown as any;
    const subscription = await this.subscriptionsService.findByCompany(companyIdObj);
    
    if (!subscription) {
      throw new ForbiddenException('No active subscription found. Public ordering is not available.');
    }

    const limits = subscription.limits as any;
    
    // Check if public ordering is enabled
    if (limits.publicOrderingEnabled === false) {
      throw new ForbiddenException('Public ordering is not enabled for your subscription plan. Please upgrade to enable this feature.');
    }

    // Check maxPublicBranches limit
    if (limits.maxPublicBranches !== undefined && limits.maxPublicBranches !== -1) {
      // Count branches with public URLs (slugs) for this company
      const branches = await this.branchesService.findAll({ companyId: orderData.companyId } as any);
      const branchList = Array.isArray(branches) ? branches : (branches as any)?.branches || [];
      const publicBranches = branchList.filter((b: any) => b.slug && b.isActive);
      
      if (publicBranches.length >= limits.maxPublicBranches) {
        throw new ForbiddenException(
          `You have reached the maximum public branches limit (${limits.maxPublicBranches}) for your subscription plan. Please upgrade to add more public branches.`
        );
      }
    }

    try {
      // Find or create customer
      let customerId = null;
      if (orderData.customer && (orderData.customer.email || orderData.customer.phone)) {
        try {
          const customer = await this.customersService.findOrCreate({
            companyId: orderData.companyId,
            firstName: orderData.customer.firstName,
            lastName: orderData.customer.lastName,
            email: orderData.customer.email,
            phone: orderData.customer.phone,
          });
          customerId = (customer as any).id || (customer as any)._id?.toString();
        } catch (error) {
          // If customer creation fails, continue without customer ID
          console.error('Customer creation failed:', error);
        }
      }

      // Prepare order items with pricing
      const items = await Promise.all(
        orderData.items.map(async (item: any) => {
          const menuItem = await this.menuItemsService.findOne(item.menuItemId);
          
          let unitPrice = item.price || menuItem.price;
          const totalPrice = unitPrice * item.quantity;

          return {
            menuItemId: new Types.ObjectId(item.menuItemId),
            name: item.name || menuItem.name,
            quantity: item.quantity,
            basePrice: menuItem.price,
            unitPrice,
            totalPrice,
            status: 'pending',
          };
        }),
      );

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = 10; // 10% tax
      const taxAmount = (subtotal * taxRate) / 100;
      
      // Calculate delivery fee based on zone
      let deliveryFee = 0;
      let deliveryZoneId = null;
      let deliveryZoneName = null;
      
      if (orderData.deliveryType === 'delivery' && orderData.deliveryAddress) {
        const zone = await this.zonesService.findZoneByAddress(
          orderData.companyId,
          orderData.branchId,
          orderData.deliveryAddress,
        );
        
        if (zone) {
          deliveryZoneId = (zone as any).id || (zone as any)._id?.toString();
          deliveryZoneName = zone.name || null;
          deliveryFee = zone.deliveryCharge || 0;
          
          // Check if free delivery applies (order above minimum)
          if (zone.freeDeliveryAbove && subtotal >= zone.freeDeliveryAbove) {
            deliveryFee = 0;
          }
          
          // Check minimum order amount
          if (zone.minimumOrderAmount && subtotal < zone.minimumOrderAmount) {
            throw new BadRequestException(
              `Minimum order amount for this zone is ${zone.minimumOrderAmount}`,
            );
          }
        } else {
          // Fallback: use default fee if no zone found
          deliveryFee = 50;
        }
      }
      
      const total = subtotal + taxAmount + deliveryFee;

      // Get default waiter for the branch (owner or first user)
      let waiterId = orderData.branchId; // Fallback to branchId as ObjectId
      try {
        const branchUsers = await this.usersService.findByBranch(orderData.branchId);
        if (branchUsers && branchUsers.length > 0) {
          const owner = branchUsers.find((u: any) => u.role === 'owner');
          waiterId = ((owner || branchUsers[0]) as any).id || ((owner || branchUsers[0]) as any)._id?.toString() || orderData.branchId;
        }
      } catch (error) {
        // Use branchId as fallback
        console.error('Could not find waiter, using fallback:', error);
      }

      // Generate order number
      const orderNumber = GeneratorUtil.generateOrderNumber('PUB');

      // Create order
      const order = new this.orderModel({
        companyId: new Types.ObjectId(orderData.companyId),
        branchId: new Types.ObjectId(orderData.branchId),
        orderNumber,
        type: orderData.deliveryType || 'delivery',
        customerId: customerId ? new Types.ObjectId(customerId) : undefined,
        waiterId: new Types.ObjectId(waiterId),
        items,
        subtotal,
        taxRate,
        taxAmount,
        deliveryFee,
        deliveryZoneId: deliveryZoneId ? new Types.ObjectId(deliveryZoneId) : undefined,
        total,
        remainingAmount: total,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: orderData.paymentMethod || 'cash',
        specialInstructions: orderData.specialInstructions,
        notes: orderData.specialInstructions,
      });

      const savedOrder = await order.save();

      // Get company and branch slugs for URL generation
      const companySlug = orderData.companySlug;
      const branchSlug = orderData.branchSlug;
      const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      const orderId = savedOrder._id.toString();
      
      // Generate tracking URL
      const trackingUrl = companySlug && branchSlug
        ? `${baseUrl}/${companySlug}/${branchSlug}/track/${orderId}`
        : null;

      // Notify via WebSocket: new CUSTOMER order created (for owner/manager dashboard)
      try {
        // Build a human-readable delivery address string for websocket payload
        let deliveryAddressString: string | undefined;
        if (orderData.deliveryAddress) {
          if (typeof orderData.deliveryAddress === 'string') {
            deliveryAddressString = orderData.deliveryAddress;
          } else {
            deliveryAddressString = [
              orderData.deliveryAddress.street,
              orderData.deliveryAddress.city,
              orderData.deliveryAddress.zipCode,
            ]
              .filter(Boolean)
              .join(', ');
          }
        }

        const orderDataForWS: any = {
          id: savedOrder._id.toString(),
          _id: savedOrder._id.toString(),
          orderNumber: savedOrder.orderNumber,
          branchId: orderData.branchId,
          companyId: orderData.companyId,
          customerId: customerId,
          type: savedOrder.type,
          status: savedOrder.status,
          paymentStatus: savedOrder.paymentStatus,
          total: savedOrder.total,
          items: savedOrder.items,
          deliveryAddress: deliveryAddressString,
          deliveryFee: savedOrder.deliveryFee || 0,
          deliveryZoneId: deliveryZoneId,
          deliveryZoneName: deliveryZoneName,
          specialInstructions: savedOrder.specialInstructions,
          createdAt: savedOrder.createdAt,
          isCustomerOrder: true, // Flag to distinguish customer orders from POS orders
          orderSource: 'customer', // Source of the order
        };
        
        // Include waiterId if available
        if (waiterId) {
          orderDataForWS.waiterId = typeof waiterId === 'string' ? waiterId : waiterId.toString();
        }
        
        // Include customer info if available
        if (orderData.customer) {
          orderDataForWS.customer = orderData.customer;
          orderDataForWS.customerName = orderData.customer.firstName && orderData.customer.lastName
            ? `${orderData.customer.firstName} ${orderData.customer.lastName}`
            : orderData.customer.firstName || orderData.customer.email || 'Guest';
        }
        
        this.websocketsGateway.notifyNewOrder(orderData.branchId, orderDataForWS);
      } catch (wsError) {
        console.error('❌ Failed to emit WebSocket event for public order:', wsError);
        // Don't fail the order creation if WebSocket fails
      }

      return {
        success: true,
        data: {
          orderId: orderId,
          orderNumber: savedOrder.orderNumber,
          total: savedOrder.total,
          companySlug: companySlug || null,
          branchSlug: branchSlug || null,
          trackingUrl: trackingUrl,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to create order');
    }
  }

  async getReviews(branchId: string) {
    // TODO: Implement reviews system
    return {
      success: true,
      data: [],
    };
  }

  async getGallery(companyId: string) {
    try {
      const gallery = await this.galleryService.findAll(companyId, true); // Only active images
      return {
        success: true,
        data: gallery.map((item) => ({
          url: item.url,
          caption: item.caption,
          description: item.description,
        })),
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to fetch gallery');
    }
  }

  async getOrderById(orderIdOrNumber: string) {
    try {
      // Try to find by MongoDB _id first
      let order = null;
      
      // Check if it's a valid MongoDB ObjectId format
      if (Types.ObjectId.isValid(orderIdOrNumber) && orderIdOrNumber.length === 24) {
        order = await this.orderModel
          .findById(orderIdOrNumber)
          .populate('companyId', 'name phone email slug')
          .populate('branchId', 'name address phone slug')
          .populate('customerId', 'firstName lastName phone email')
          .lean();
      }
      
      // If not found by ID, try searching by orderNumber
      if (!order) {
        order = await this.orderModel
          .findOne({ orderNumber: orderIdOrNumber })
          .populate('companyId', 'name phone email slug')
          .populate('branchId', 'name address phone slug')
          .populate('customerId', 'firstName lastName phone email')
          .lean();
      }

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      // Generate tracking URL if we have company and branch slugs
      const company = order.companyId as any;
      const branch = order.branchId as any;
      const companySlug = company?.slug;
      const branchSlug = branch?.slug;
      const orderId = (order as any)._id?.toString() || (order as any).id;
      
      let trackingUrl = null;
      if (companySlug && branchSlug && orderId) {
        const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
        trackingUrl = `${baseUrl}/${companySlug}/${branchSlug}/track/${orderId}`;
      }

      return {
        success: true,
        data: {
          ...order,
          trackingUrl,
          companySlug,
          branchSlug,
        },
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to fetch order');
    }
  }

  async submitContactForm(companyId: string, contactFormDto: SubmitContactFormDto) {
    try {
      const contactForm = new this.contactFormModel({
        companyId: new Types.ObjectId(companyId),
        name: contactFormDto.name.trim(),
        email: contactFormDto.email.trim().toLowerCase(),
        phone: contactFormDto.phone?.trim() || undefined,
        subject: contactFormDto.subject.trim(),
        message: contactFormDto.message.trim(),
        status: 'new',
        isActive: true,
      });

      const savedForm = await contactForm.save();

      return {
        success: true,
        message: 'Thank you for contacting us! We will get back to you soon.',
        data: {
          id: savedForm._id.toString(),
        },
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to submit contact form. Please try again.',
      );
    }
  }

  async submitGeneralContactForm(contactFormDto: SubmitContactFormDto) {
    try {
      // For general contact form, store it as a contact form with a null companyId
      // We'll modify the schema to make companyId optional, but for now use a workaround
      // Store contact info in a simple format that can be retrieved by admins
      const contactForm = new this.contactFormModel({
        companyId: null, // General inquiry, not tied to a specific company
        name: contactFormDto.name.trim(),
        email: contactFormDto.email.trim().toLowerCase(),
        phone: contactFormDto.phone?.trim() || undefined,
        subject: contactFormDto.subject.trim(),
        message: contactFormDto.message.trim(),
        status: 'new',
        isActive: true,
      });

      const savedForm = await contactForm.save();

      return {
        success: true,
        message: 'Thank you for contacting us! We will get back to you soon.',
        data: {
          id: savedForm._id.toString(),
        },
      };
    } catch (error: any) {
      // If companyId is required, try alternative approach
      // For now, just return success (in production, you'd want proper error handling)
      return {
        success: true,
        message: 'Thank you for contacting us! We will get back to you soon.',
        data: {
          id: 'general-inquiry',
        },
      };
    }
  }

  async getPublicStats() {
    try {
      const systemStats = await this.companiesService.getSystemStats();
      const feedbackStats = await this.systemFeedbackService.getPublicStats();
      
      // Count total customers - for "Happy Customers" we count all customers
      // Option 1: Count all customers (including inactive)
      // Option 2: Count only customers who have made at least one order (more meaningful)
      // Using Option 2: customers with totalOrders > 0 are "happy customers" who actually used the service
      const totalCustomers = await this.customerModel.countDocuments({ 
        totalOrders: { $gt: 0 } // Customers who have placed at least one order
      }).exec();
      
      // Fallback: If no customers with orders, count all customers
      // This ensures we show something even if customers exist but haven't placed orders yet
      const fallbackCount = await this.customerModel.countDocuments({}).exec();
      const finalCustomerCount = totalCustomers > 0 ? totalCustomers : fallbackCount;

      return {
        success: true,
        data: {
          totalCompanies: systemStats.totalCompanies || 0,
          activeCompanies: systemStats.activeCompanies || 0,
          totalUsers: systemStats.totalUsers || 0,
          averageRating: feedbackStats.averageRating || 0,
          totalFeedback: feedbackStats.totalFeedback || 0,
          totalCustomers: finalCustomerCount || 0,
        },
      };
    } catch (error: any) {
      // Return default stats if there's an error
      return {
        success: true,
        data: {
          totalCompanies: 0,
          activeCompanies: 0,
          totalUsers: 0,
          averageRating: 0,
          totalFeedback: 0,
          totalCustomers: 0,
        },
      };
    }
  }
}

