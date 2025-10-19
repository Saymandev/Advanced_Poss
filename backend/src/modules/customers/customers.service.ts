import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Check if customer already exists
    const existingCustomer = await this.customerModel.findOne({
      companyId: new Types.ObjectId(createCustomerDto.companyId),
      $or: [
        { email: createCustomerDto.email },
        { phone: createCustomerDto.phone },
      ],
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

    const customer = new this.customerModel({
      ...createCustomerDto,
      loyaltyTier: 'bronze',
      loyaltyTierSince: new Date(),
    });

    return customer.save();
  }

  async findAll(filter: any = {}): Promise<Customer[]> {
    return this.customerModel.find(filter).sort({ createdAt: -1 }).exec();
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
    return this.customerModel.findOne({
      companyId: new Types.ObjectId(companyId),
      email,
    });
  }

  async findByPhone(companyId: string, phone: string): Promise<Customer | null> {
    return this.customerModel.findOne({
      companyId: new Types.ObjectId(companyId),
      phone,
    });
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

  async search(companyId: string, query: string): Promise<Customer[]> {
    return this.customerModel
      .find({
        companyId: new Types.ObjectId(companyId),
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
        ],
        isActive: true,
      })
      .limit(20)
      .exec();
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

    return customer.save();
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

