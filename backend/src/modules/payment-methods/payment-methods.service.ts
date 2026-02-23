import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import {
    PaymentMethod,
    PaymentMethodDocument,
} from './schemas/payment-method.schema';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectModel(PaymentMethod.name)
    private paymentMethodModel: Model<PaymentMethodDocument>,
  ) {}

  async create(
    createDto: CreatePaymentMethodDto,
    userId?: string,
  ): Promise<PaymentMethod> {
    // Check if code already exists for this scope (system-wide or company-specific)
    const existing = await this.paymentMethodModel.findOne({
      code: createDto.code,
      companyId: createDto.companyId ? new Types.ObjectId(createDto.companyId) : null,
    });

    if (existing) {
      throw new BadRequestException(
        `Payment method with code "${createDto.code}" already exists`,
      );
    }

    const paymentMethod = new this.paymentMethodModel({
      ...createDto,
      companyId: createDto.companyId
        ? new Types.ObjectId(createDto.companyId)
        : undefined,
      branchId: createDto.branchId
        ? new Types.ObjectId(createDto.branchId)
        : undefined,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    return paymentMethod.save();
  }

  async findAll(filter: any = {}): Promise<PaymentMethod[]> {
    const query: any = {};

    if (filter.companyId) {
      query.companyId = new Types.ObjectId(filter.companyId);
    } else if (filter.systemOnly) {
      query.$or = [{ companyId: { $exists: false } }, { companyId: null }];
    }

    if (filter.branchId) {
      query.branchId = new Types.ObjectId(filter.branchId);
    }

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive;
    }

    return this.paymentMethodModel
      .find(query)
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findSystemPaymentMethods(): Promise<PaymentMethod[]> {
    return this.paymentMethodModel
      .find({
        $or: [{ companyId: { $exists: false } }, { companyId: null }],
        isActive: true,
      })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findByCompany(companyId: string): Promise<PaymentMethod[]> {
    // Get both system-wide and company-specific payment methods
    const systemMethods = await this.paymentMethodModel
      .find({
        $or: [{ companyId: { $exists: false } }, { companyId: null }],
        isActive: true,
      })
      .sort({ sortOrder: 1, name: 1 })
      .exec();

    const companyMethods = await this.paymentMethodModel
      .find({
        companyId: new Types.ObjectId(companyId),
        isActive: true,
      })
      .sort({ sortOrder: 1, name: 1 })
      .exec();

    // Merge and deduplicate by code (company methods override system methods)
    const methodMap = new Map<string, PaymentMethod>();

    systemMethods.forEach((method) => {
      methodMap.set(method.code, method);
    });

    companyMethods.forEach((method) => {
      methodMap.set(method.code, method);
    });

    return Array.from(methodMap.values()).sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name),
    );
  }

  async findByBranch(
    companyId: string,
    branchId: string,
  ): Promise<PaymentMethod[]> {
    // Get system-wide, company-wide, and branch-specific methods
    const allMethods = await this.findByCompany(companyId);

    const branchMethods = await this.paymentMethodModel
      .find({
        branchId: new Types.ObjectId(branchId),
        isActive: true,
      })
      .sort({ sortOrder: 1, name: 1 })
      .exec();

    // Merge with branch methods taking precedence
    const methodMap = new Map<string, PaymentMethod>();

    allMethods.forEach((method) => {
      methodMap.set(method.code, method);
    });

    branchMethods.forEach((method) => {
      methodMap.set(method.code, method);
    });

    return Array.from(methodMap.values()).sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name),
    );
  }


  async findOne(id: string): Promise<PaymentMethod> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment method ID');
    }

    const method = await this.paymentMethodModel.findById(id).exec();

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    return method;
  }

  async update(
    id: string,
    updateDto: UpdatePaymentMethodDto,
    userId?: string,
  ): Promise<PaymentMethod> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment method ID');
    }

    // Check code uniqueness if code is being updated
    if (updateDto.code) {
      const existing = await this.paymentMethodModel.findOne({
        code: updateDto.code,
        _id: { $ne: new Types.ObjectId(id) },
        companyId: updateDto.companyId
          ? new Types.ObjectId(updateDto.companyId)
          : null,
      });

      if (existing) {
        throw new BadRequestException(
          `Payment method with code "${updateDto.code}" already exists`,
        );
      }
    }

    const updateData: any = {
      ...updateDto,
      updatedBy: userId ? new Types.ObjectId(userId) : undefined,
    };

    if (updateDto.companyId) {
      updateData.companyId = new Types.ObjectId(updateDto.companyId);
    }
    if (updateDto.branchId) {
      updateData.branchId = new Types.ObjectId(updateDto.branchId);
    }

    const method = await this.paymentMethodModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    return method;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment method ID');
    }

    const result = await this.paymentMethodModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Payment method not found');
    }
  }
}

