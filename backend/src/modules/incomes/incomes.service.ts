import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import { ExpenseFilterDto } from '../../common/dto/pagination.dto';
import { isSuperAdmin } from '../../common/utils/query.utils';
import { TransactionCategory, TransactionType } from '../transactions/schemas/transaction.schema';
import { TransactionsService } from '../transactions/transactions.service';
import { WorkPeriodsService } from '../work-periods/work-periods.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { Income, IncomeDocument } from './schemas/income.schema';

@Injectable()
export class IncomesService {
  constructor(
    @InjectModel(Income.name)
    private incomeModel: Model<IncomeDocument>,
    @Inject(forwardRef(() => TransactionsService))
    private transactionsService: TransactionsService,
    @Inject(forwardRef(() => WorkPeriodsService))
    private workPeriodsService: WorkPeriodsService,
  ) {}

  async create(createIncomeDto: CreateIncomeDto, userRole?: string): Promise<Income> {
    const normalizedRole = userRole?.toLowerCase();
    const isOwnerOrSuperAdmin = normalizedRole === 'owner' || normalizedRole === 'super_admin';

    // If not owner/super_admin, check for active work period
    if (!isOwnerOrSuperAdmin) {
      const activePeriod = await this.workPeriodsService.findActive(
        createIncomeDto.companyId,
        createIncomeDto.branchId,
      );
      if (!activePeriod) {
        throw new BadRequestException('Incomes can only be recorded during an active work period.');
      }
    }

    const incomeNumber = await this.generateIncomeNumber(
      createIncomeDto.branchId,
    );
    const incomeData: any = {
      ...createIncomeDto,
      incomeNumber,
      status: createIncomeDto.status || 'pending',
    };

    // Convert string IDs to ObjectIds
    if (incomeData.companyId && typeof incomeData.companyId === 'string') {
      incomeData.companyId = new Types.ObjectId(incomeData.companyId);
    }
    if (incomeData.branchId && typeof incomeData.branchId === 'string') {
      incomeData.branchId = new Types.ObjectId(incomeData.branchId);
    }
    if (incomeData.createdBy && typeof incomeData.createdBy === 'string') {
      incomeData.createdBy = new Types.ObjectId(incomeData.createdBy);
    }

    const activeWorkPeriod = await this.workPeriodsService.findActive(
      createIncomeDto.companyId,
      createIncomeDto.branchId,
    );

    const income = new this.incomeModel({
      ...incomeData,
      workPeriodId: activeWorkPeriod?._id || undefined,
    });
    const savedIncome = await income.save();

    // If received, record transaction in ledger
    if (savedIncome.status === 'received') {
      await this.recordLedgerTransaction(savedIncome);
    }

    return savedIncome;
  }

  async findAll(filterDto: ExpenseFilterDto, userRole?: string): Promise<{ incomes: Income[], total: number, page: number, limit: number }> {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'date', 
      sortOrder = 'desc',
      search,
      companyId,
      branchId,
      category,
      status,
      startDate,
      endDate,
    } = filterDto;
    const skip = (page - 1) * limit;
    const query: any = {};

    if (isSuperAdmin(userRole)) {
      if (companyId) {
        query.companyId = typeof companyId === 'string' 
          ? new Types.ObjectId(companyId) 
          : companyId;
      }
    } else {
      if (!companyId) {
        throw new BadRequestException('Company ID is required');
      }
      query.companyId = typeof companyId === 'string' 
        ? new Types.ObjectId(companyId) 
        : companyId;
    }

    if (branchId) {
      query.branchId = typeof branchId === 'string' 
        ? new Types.ObjectId(branchId) 
        : branchId;
    }

    if (category) {
      query.category = category;
    }
    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search) {
      const searchConditions = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { incomeNumber: { $regex: search, $options: 'i' } },
        ],
      };
      if (Object.keys(query).length > 0) {
        query.$and = [
          { ...query },
          searchConditions,
        ];
      } else {
        Object.assign(query, searchConditions);
      }
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const incomes = await this.incomeModel
      .find(query)
      .populate('branchId', 'name code')
      .populate('createdBy', 'firstName lastName')
      .populate('receivedBy', 'firstName lastName')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.incomeModel.countDocuments(query);

    return {
      incomes,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Income> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid income ID');
    }
    const income = await this.incomeModel
      .findById(id)
      .populate('branchId', 'name code address')
      .populate('createdBy', 'firstName lastName employeeId')
      .populate('receivedBy', 'firstName lastName');
    if (!income) {
      throw new NotFoundException('Income not found');
    }
    return income;
  }

  async update(
    id: string,
    updateIncomeDto: UpdateIncomeDto,
  ): Promise<Income> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid income ID');
    }
    
    const existingIncome = await this.incomeModel.findById(id);
    if (!existingIncome) {
      throw new NotFoundException('Income not found');
    }

    const originalStatus = existingIncome.status;
    
    const updatedIncome = await this.incomeModel.findByIdAndUpdate(
      id,
      updateIncomeDto,
      { new: true },
    );

    // If status changed to 'received', record transaction
    if (updatedIncome.status === 'received' && originalStatus !== 'received') {
      await this.recordLedgerTransaction(updatedIncome as any);
    }

    return updatedIncome;
  }

  async markAsReceived(id: string, receiverId: string): Promise<Income> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid income ID');
    }
    const income = await this.incomeModel.findById(id);
    if (!income) {
      throw new NotFoundException('Income not found');
    }
    if (income.status === 'received') {
      return income;
    }
    income.status = 'received';
    income.receivedBy = new Types.ObjectId(receiverId);
    income.receivedAt = new Date();
    
    const savedIncome = await income.save();

    // Record transaction in ledger
    await this.recordLedgerTransaction(savedIncome);

    return savedIncome;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid income ID');
    }
    const result = await this.incomeModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Income not found');
    }
  }

  private async recordLedgerTransaction(income: IncomeDocument) {
    const logPath = path.join(process.cwd(), 'txn-debug.log');
    try {
      const companyId = (income as any).companyId?.toString();
      const branchId = (income as any).branchId?.toString();
      const userId = (income as any).createdBy?.toString();

      fs.appendFileSync(logPath, `[INCOME] Recording txn for ${income.incomeNumber}, Method: ${income.paymentMethod}, Amount: ${income.amount}, Company: ${companyId}\n`);

      await this.transactionsService.recordTransaction(
        {
          paymentMethodId: income.paymentMethod || 'cash',
          type: TransactionType.IN,
          category: TransactionCategory.INCOME,
          amount: income.amount,
          date: income.date ? new Date(income.date).toISOString() : new Date().toISOString(),
          referenceId: income._id.toString(),
          referenceModel: 'Income',
          description: `Income: ${income.title}`,
          notes: income.incomeNumber,
        },
        companyId,
        branchId,
        userId,
      );
    } catch (txnError) {
      fs.appendFileSync(logPath, `[INCOME] Error recorded: ${txnError.message}\n`);
      console.error('❌ Failed to record transaction in ledger for income:', txnError);
    }
  }

  private async generateIncomeNumber(branchId: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const count = await this.incomeModel.countDocuments({
      branchId: new Types.ObjectId(branchId),
    });
    const sequence = String(count + 1).padStart(4, '0');
    return `INC-${dateStr}-${sequence}`;
  }

  async getStats(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const incomes = await this.incomeModel.find({
      branchId: new Types.ObjectId(branchId),
      date: { $gte: startDate, $lte: endDate },
    });
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const receivedIncomes = incomes.filter((i) => i.status === 'received');
    const pendingIncomes = incomes.filter((i) => i.status === 'pending');

    const byCategory = {};
    const byPaymentMethod = {};

    incomes.forEach((i) => {
      byCategory[i.category] = (byCategory[i.category] || 0) + i.amount;
      byPaymentMethod[i.paymentMethod] = (byPaymentMethod[i.paymentMethod] || 0) + i.amount;
    });

    return {
      count: incomes.length,
      totalIncome,
      received: receivedIncomes.length,
      receivedAmount: receivedIncomes.reduce((sum, i) => sum + i.amount, 0),
      pending: pendingIncomes.length,
      pendingAmount: pendingIncomes.reduce((sum, i) => sum + i.amount, 0),
      byCategory,
      byPaymentMethod,
      averageIncome: incomes.length > 0 ? totalIncome / incomes.length : 0,
    };
  }
}
