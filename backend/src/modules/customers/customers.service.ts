import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomerFilterDto } from '../../common/dto/pagination.dto';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer, CustomerDocument } from './schemas/customer.schema';
@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(POSOrder.name)
    private posOrderModel: Model<POSOrderDocument>,
  ) {}
  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Check if customer already exists
    const existingConditions: any[] = [
      { email: createCustomerDto.email },
    ];
    // Only check phone if provided
    if (createCustomerDto.phone && createCustomerDto.phone.trim()) {
      existingConditions.push({ phone: createCustomerDto.phone });
    }
    const existingCustomer = await this.customerModel.findOne({
      companyId: new Types.ObjectId(createCustomerDto.companyId),
      $or: existingConditions,
    });
    if (existingCustomer) {
      if (existingCustomer.email === createCustomerDto.email) {
        throw new BadRequestException(
          'Customer with this email already exists',
        );
      }
      throw new BadRequestException(
        'Customer with this phone number already exists',
      );
    }
    // Convert branchId to ObjectId if provided
    const customerData: any = {
      ...createCustomerDto,
      loyaltyTier: 'bronze',
      loyaltyTierSince: new Date(),
    };
    if (createCustomerDto.branchId && Types.ObjectId.isValid(createCustomerDto.branchId)) {
      customerData.branchId = new Types.ObjectId(createCustomerDto.branchId);
    }
    if (createCustomerDto.companyId && Types.ObjectId.isValid(createCustomerDto.companyId)) {
      customerData.companyId = new Types.ObjectId(createCustomerDto.companyId);
    }
    // Normalize email to lowercase for consistent matching
    if (customerData.email) {
      customerData.email = customerData.email.toLowerCase().trim();
    }
    const customer = new this.customerModel(customerData);
    return customer.save();
  }
  async findAll(filterDto: CustomerFilterDto): Promise<{ customers: Customer[], total: number, page: number, limit: number }> {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search,
      companyId,
      branchId,
      ...filters 
    } = filterDto;
    const skip = (page - 1) * limit;
    const query: any = {};
    // Convert companyId to ObjectId if provided
    if (companyId && Types.ObjectId.isValid(companyId)) {
      query.companyId = new Types.ObjectId(companyId);
    }
    // Build branchId filter - show customers for this branch OR customers without branchId (company-wide)
    if (branchId && Types.ObjectId.isValid(branchId)) {
      const branchObjectId = new Types.ObjectId(branchId);
      // Use $or to match branchId OR null/undefined branchId
      query.$or = [
        { branchId: branchObjectId },
        { branchId: { $exists: false } },
        { branchId: null }
      ];
    }
    // Build search filter
    if (search) {
      const searchConditions = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } }
      ];
      // If we already have $or for branchId, combine with $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }
    // Log query for debugging
   
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    try {
      // Debug logging
      
      const customers = await this.customerModel
        .find(query)
        .populate('companyId', 'name email')
        .populate('branchId', 'name address')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec();
      const total = await this.customerModel.countDocuments(query);
      return {
        customers,
        total,
        page,
        limit,
      };
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      console.error('Query that caused error:', JSON.stringify(query, null, 2));
      throw new BadRequestException(
        `Failed to fetch customers: ${error.message || 'Unknown error'}`
      );
    }
  }
  async findOrCreate(customerData: any): Promise<Customer> {
    // Try to find existing customer by email or phone
    const existingCustomer = await this.customerModel.findOne({
      companyId: new Types.ObjectId(customerData.companyId),
      $or: [
        { email: customerData.email },
        { phone: customerData.phone },
      ],
    });
    if (existingCustomer) {
      return existingCustomer;
    }
    // Create new customer
    const [firstName, ...lastNameParts] = (customerData.name || customerData.firstName || 'Customer').split(' ');
    const lastName = lastNameParts.join(' ') || customerData.lastName || '';
    return this.create({
      companyId: customerData.companyId,
      firstName,
      lastName,
      email: customerData.email || '',
      phone: customerData.phone || '',
    } as any);
  }
  async findOne(id: string): Promise<Customer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
  async findByEmail(companyId: string, email: string): Promise<Customer | null> {
    if (!email) return null;
    const normalizedEmail = email.toLowerCase().trim();
    const customer = await this.customerModel.findOne({
      companyId: new Types.ObjectId(companyId),
      $or: [
        { email: normalizedEmail },
        { email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ],
    });
    return customer;
  }
  async findByPhone(companyId: string, phone: string): Promise<Customer | null> {
    return this.customerModel.findOne({
      companyId: new Types.ObjectId(companyId),
      phone,
    });
  }
  async getCustomerOrders(customerId: string): Promise<{ orders: any[]; total: number }> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const customer = await this.customerModel.findById(customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    // Find orders by customer email from POS orders
    if (!customer.email) {
      return {
        orders: [],
        total: customer.totalOrders || 0,
      };
    }
    try {
      const orders = await this.posOrderModel
        .find({
          'customerInfo.email': customer.email.toLowerCase().trim(),
          status: { $ne: 'cancelled' },
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      const formattedOrders = orders.map((order: any) => ({
        id: order._id?.toString() || order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        items: order.items || [],
      }));
      return {
        orders: formattedOrders,
        total: formattedOrders.length,
      };
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      return {
        orders: [],
        total: customer.totalOrders || 0,
      };
    }
  }
  async findByCompany(companyId: string): Promise<Customer[]> {
    return this.customerModel
      .find({ companyId: new Types.ObjectId(companyId), isActive: true })
      .sort({ totalSpent: -1 })
      .exec();
  }
  async findVIPCustomers(companyId: string): Promise<Customer[]> {
    return this.customerModel
      .find({
        companyId: new Types.ObjectId(companyId),
        isVIP: true,
        isActive: true,
      })
      .sort({ totalSpent: -1 })
      .exec();
  }
  async findTopCustomers(
    companyId: string,
    limit: number = 10,
  ): Promise<Customer[]> {
    return this.customerModel
      .find({ companyId: new Types.ObjectId(companyId), isActive: true })
      .sort({ totalSpent: -1 })
      .limit(limit)
      .exec();
  }
  async search(companyId: string, query: string, branchId?: string): Promise<Customer[]> {
    const searchQuery: any = {
      companyId: new Types.ObjectId(companyId),
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ],
      isActive: true,
    };
    // If branchId is provided, show customers for this branch OR customers without branchId (company-wide)
    if (branchId && Types.ObjectId.isValid(branchId)) {
      const branchObjectId = new Types.ObjectId(branchId);
      searchQuery.$and = [
        { $or: searchQuery.$or },
        {
          $or: [
            { branchId: branchObjectId },
            { branchId: { $exists: false } },
            { branchId: null }
          ]
        }
      ];
      delete searchQuery.$or;
    }
   
    const customers = await this.customerModel
      .find(searchQuery)
      .limit(20)
      .exec();
    return customers;
  }
  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const customer = await this.customerModel.findByIdAndUpdate(
      id,
      updateCustomerDto,
      { new: true },
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
  async addLoyaltyPoints(id: string, points: number): Promise<Customer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    customer.loyaltyPoints += points;
    // Update tier based on points
    if (customer.loyaltyPoints >= 10000) {
      customer.loyaltyTier = 'platinum';
    } else if (customer.loyaltyPoints >= 5000) {
      customer.loyaltyTier = 'gold';
    } else if (customer.loyaltyPoints >= 1000) {
      customer.loyaltyTier = 'silver';
    }
    return customer.save();
  }
  async redeemLoyaltyPoints(id: string, points: number): Promise<Customer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (customer.loyaltyPoints < points) {
      throw new BadRequestException('Insufficient loyalty points');
    }
    customer.loyaltyPoints -= points;
    return customer.save();
  }
  async updateOrderStats(
    id: string,
    orderAmount: number,
  ): Promise<Customer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const customer = await this.customerModel.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const oldStats = {
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      loyaltyPoints: customer.loyaltyPoints,
    };
    customer.totalOrders += 1;
    customer.totalSpent += orderAmount;
    customer.averageOrderValue = customer.totalSpent / customer.totalOrders;
    customer.lastOrderDate = new Date();
    if (!customer.firstOrderDate) {
      customer.firstOrderDate = new Date();
    }
    // Award loyalty points (1 point per dollar spent)
    const pointsEarned = Math.floor(orderAmount);
    customer.loyaltyPoints += pointsEarned;
    // Update tier
    if (customer.loyaltyPoints >= 10000) {
      customer.loyaltyTier = 'platinum';
    } else if (customer.loyaltyPoints >= 5000) {
      customer.loyaltyTier = 'gold';
    } else if (customer.loyaltyPoints >= 1000) {
      customer.loyaltyTier = 'silver';
    }
    const savedCustomer = await customer.save();
    return savedCustomer;
  }
  async makeVIP(id: string): Promise<Customer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const customer = await this.customerModel.findByIdAndUpdate(
      id,
      {
        isVIP: true,
        vipSince: new Date(),
      },
      { new: true },
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
  async removeVIP(id: string): Promise<Customer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const customer = await this.customerModel.findByIdAndUpdate(
      id,
      {
        isVIP: false,
        vipSince: null,
      },
      { new: true },
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
  async deactivate(id: string): Promise<Customer> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const customer = await this.customerModel.findByIdAndUpdate(
      id,
      {
        isActive: false,
        deactivatedAt: new Date(),
      },
      { new: true },
    );
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }
    const result = await this.customerModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Customer not found');
    }
  }
  async getStats(companyId: string): Promise<any> {
    const customers = await this.customerModel.find({
      companyId: new Types.ObjectId(companyId),
    });
    const activeCustomers = customers.filter((c) => c.isActive);
    return {
      total: customers.length,
      active: activeCustomers.length,
      inactive: customers.length - activeCustomers.length,
      vip: customers.filter((c) => c.isVIP).length,
      tierBreakdown: {
        bronze: customers.filter((c) => c.loyaltyTier === 'bronze').length,
        silver: customers.filter((c) => c.loyaltyTier === 'silver').length,
        gold: customers.filter((c) => c.loyaltyTier === 'gold').length,
        platinum: customers.filter((c) => c.loyaltyTier === 'platinum').length,
      },
      totalRevenue: activeCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
      averageLifetimeValue:
        activeCustomers.length > 0
          ? activeCustomers.reduce((sum, c) => sum + c.totalSpent, 0) /
            activeCustomers.length
          : 0,
    };
  }
}
