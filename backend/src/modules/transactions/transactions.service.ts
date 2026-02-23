import {
    BadRequestException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import { PaymentMethod } from '../payment-methods/schemas/payment-method.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Transaction, TransactionCategory, TransactionDocument, TransactionType } from './schemas/transaction.schema';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(PaymentMethod.name) private paymentMethodModel: Model<PaymentMethod>,
  ) {}

  private async generateTransactionNumber(companyId: string): Promise<string> {
    const date = new Date();
    const prefix = `TRX-${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;

    const lastTransaction = await this.transactionModel
      .findOne({
        transactionNumber: { $regex: `^${prefix}` },
      })
      .sort({ transactionNumber: -1 });

    if (!lastTransaction) {
      return `${prefix}-0001`;
    }

    const lastNumber = parseInt(
      lastTransaction.transactionNumber.split('-')[2],
      10,
    );
    return `${prefix}-${(lastNumber + 1).toString().padStart(4, '0')}`;
  }

  async recordTransaction(
    createTransactionDto: CreateTransactionDto,
    companyId: string,
    branchId: string,
    userId: string,
  ): Promise<Transaction> {
    const logPath = path.join(process.cwd(), 'txn-debug.log');
    
    let paymentMethod;
    if (Types.ObjectId.isValid(createTransactionDto.paymentMethodId)) {
      paymentMethod = await this.paymentMethodModel.findById(createTransactionDto.paymentMethodId);
    } else {
      const codeQuery = { 
        code: { $regex: new RegExp(`^${createTransactionDto.paymentMethodId}$`, 'i') } 
      };

      // 1. Look for company-specific method first
      paymentMethod = companyId ? await this.paymentMethodModel.findOne({
        ...codeQuery,
        companyId: new Types.ObjectId(companyId),
      }) : null;

      // 2. If no company-specific method, look for system-wide (but don't use it — create a company copy)
      if (!paymentMethod && companyId) {
        const systemMethod = await this.paymentMethodModel.findOne({
          ...codeQuery,
          $or: [{ companyId: { $exists: false } }, { companyId: null }],
        });

        if (systemMethod) {
          // Auto-create a company-specific copy so each company has an isolated ledger account
          const newMethod = new this.paymentMethodModel({
            name: systemMethod.name,
            code: systemMethod.code,
            displayName: systemMethod.displayName,
            type: systemMethod.type,
            icon: systemMethod.icon,
            color: systemMethod.color,
            sortOrder: systemMethod.sortOrder,
            isActive: true,
            currentBalance: 0,
            companyId: new Types.ObjectId(companyId),
          });
          try {
            paymentMethod = await newMethod.save();
            fs.appendFileSync(logPath, `[TXN] Auto-created company payment method: ${paymentMethod.code} for company ${companyId}\n`);
          } catch (dupErr: any) {
            // Race condition — another request created it first, fetch it
            paymentMethod = await this.paymentMethodModel.findOne({
              ...codeQuery,
              companyId: new Types.ObjectId(companyId),
            });
          }
        }
      }

      // 3. Last resort: system-wide method (legacy / single-tenant)
      if (!paymentMethod) {
        paymentMethod = await this.paymentMethodModel.findOne({
          ...codeQuery,
          $or: [{ companyId: { $exists: false } }, { companyId: null }],
        });
      }
    }

    if (!paymentMethod) {
      fs.appendFileSync(logPath, `[TXN] Error: Method not found: ${createTransactionDto.paymentMethodId}\n`);
      throw new NotFoundException(`Payment method not found: ${createTransactionDto.paymentMethodId}`);
    }

    const amount = Number(createTransactionDto.amount);
    let currentBalance = Number(paymentMethod.currentBalance) || 0;
    const balanceAfter = createTransactionDto.type === TransactionType.IN ? currentBalance + amount : currentBalance - amount;

    paymentMethod.currentBalance = balanceAfter;
    await paymentMethod.save();

    const transactionNumber = await this.generateTransactionNumber(companyId);
    const newTransaction = new this.transactionModel({
      ...createTransactionDto,
      transactionNumber,
      balanceAfter,
      companyId: companyId ? new Types.ObjectId(companyId) : undefined,
      branchId: branchId ? new Types.ObjectId(branchId) : undefined,
      paymentMethodId: paymentMethod._id,
      referenceId: createTransactionDto.referenceId && Types.ObjectId.isValid(createTransactionDto.referenceId) ? new Types.ObjectId(createTransactionDto.referenceId) : undefined,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      date: createTransactionDto.date ? new Date(createTransactionDto.date) : new Date(),
    });

    try {
      const saved = await newTransaction.save();
      fs.appendFileSync(logPath, `[TXN] Success: ${saved._id}\n`);
      return saved;
    } catch (err) {
      fs.appendFileSync(logPath, `[TXN] Save Error: ${err.message}\n`);
      throw err;
    }
  }

  async withdrawProfit(
    paymentMethodId: string,
    amount: number,
    notes: string,
    companyId: string,
    branchId: string,
    userId: string,
  ): Promise<Transaction> {
    const dto: CreateTransactionDto = {
      paymentMethodId,
      type: TransactionType.OUT,
      category: TransactionCategory.PROFIT_WITHDRAWAL,
      amount,
      date: new Date().toISOString(),
      description: 'Owner Profit Withdrawal',
      notes,
    };

    return this.recordTransaction(dto, companyId, branchId, userId);
  }

  async findAll(companyId: string, query: any) {
    const { page = 1, limit = 10, paymentMethodId, type, category, startDate, endDate } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { companyId: new Types.ObjectId(companyId) };

    if (paymentMethodId) filter.paymentMethodId = new Types.ObjectId(paymentMethodId);
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .populate('paymentMethodId', 'name type code')
        .populate('createdBy', 'firstName lastName name')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);

    return { transactions, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(id: string, companyId: string): Promise<Transaction> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid transaction ID');
    }

    const transaction = await this.transactionModel
      .findOne({
        _id: new Types.ObjectId(id),
        companyId: new Types.ObjectId(companyId),
      })
      .populate('paymentMethodId', 'name type code')
      .populate('createdBy', 'firstName lastName name')
      .exec();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getAccountBalances(companyId: string): Promise<any[]> {
    const systemMethods = await this.paymentMethodModel
      .find({
        $or: [{ companyId: { $exists: false } }, { companyId: null }],
        isActive: true,
      })
      .select('name type code currentBalance sortOrder')
      .lean()
      .exec();

    const companyMethods = await this.paymentMethodModel
      .find({
        companyId: new Types.ObjectId(companyId),
        isActive: true,
      })
      .select('name type code currentBalance sortOrder')
      .lean()
      .exec();

    const methodMap = new Map<string, any>();

    systemMethods.forEach((method: any) => {
      methodMap.set(method.code, {
        ...method,
        id: method._id.toString(),
        currentBalance: Number(method.currentBalance) || 0,
      });
    });

    companyMethods.forEach((method: any) => {
      methodMap.set(method.code, {
        ...method,
        id: method._id.toString(),
        currentBalance: Number(method.currentBalance) || 0,
      });
    });

    return Array.from(methodMap.values()).sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name),
    );
  }
}
