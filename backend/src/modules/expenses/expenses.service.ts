import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExpenseFilterDto } from '../../common/dto/pagination.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense, ExpenseDocument } from './schemas/expense.schema';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private expenseModel: Model<ExpenseDocument>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    const expenseNumber = await this.generateExpenseNumber(
      createExpenseDto.branchId,
    );

    const expense = new this.expenseModel({
      ...createExpenseDto,
      expenseNumber,
      status: 'pending',
    });

    return expense.save();
  }

  async findAll(filterDto: ExpenseFilterDto): Promise<{ expenses: Expense[], total: number, page: number, limit: number }> {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'date', 
      sortOrder = 'desc',
      search,
      ...filters 
    } = filterDto;
    
    const skip = (page - 1) * limit;
    const query: any = { ...filters };

    // Add date range filtering
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const expenses = await this.expenseModel
      .find(query)
      .populate('branchId', 'name code')
      .populate('supplierId', 'name contactPerson')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.expenseModel.countDocuments(query);

    return {
      expenses,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Expense> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid expense ID');
    }

    const expense = await this.expenseModel
      .findById(id)
      .populate('branchId', 'name code address')
      .populate('supplierId', 'name contactPerson phone email')
      .populate('createdBy', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName');

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async findByBranch(
    branchId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Expense[]> {
    const filter: any = {
      branchId: new Types.ObjectId(branchId),
    };

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    return this.expenseModel
      .find(filter)
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ date: -1 })
      .exec();
  }

  async findByCategory(
    branchId: string,
    category: string,
  ): Promise<Expense[]> {
    return this.expenseModel
      .find({
        branchId: new Types.ObjectId(branchId),
        category,
      })
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 })
      .exec();
  }

  async findPending(branchId: string): Promise<Expense[]> {
    return this.expenseModel
      .find({
        branchId: new Types.ObjectId(branchId),
        status: 'pending',
      })
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 })
      .exec();
  }

  async findRecurring(branchId: string): Promise<Expense[]> {
    return this.expenseModel
      .find({
        branchId: new Types.ObjectId(branchId),
        isRecurring: true,
      })
      .populate('createdBy', 'firstName lastName')
      .sort({ nextRecurringDate: 1 })
      .exec();
  }

  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<Expense> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid expense ID');
    }

    const expense = await this.expenseModel.findByIdAndUpdate(
      id,
      updateExpenseDto,
      { new: true },
    );

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async approve(id: string, approverId: string): Promise<Expense> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid expense ID');
    }

    const expense = await this.expenseModel.findById(id);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== 'pending') {
      throw new BadRequestException('Expense is not pending approval');
    }

    expense.status = 'approved';
    expense.approvedBy = new Types.ObjectId(approverId);
    expense.approvedAt = new Date();

    return expense.save();
  }

  async reject(id: string, approverId: string, reason?: string): Promise<Expense> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid expense ID');
    }

    const expense = await this.expenseModel.findById(id);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== 'pending') {
      throw new BadRequestException('Expense is not pending approval');
    }

    expense.status = 'rejected';
    expense.approvedBy = new Types.ObjectId(approverId);
    expense.approvedAt = new Date();
    if (reason) {
      expense.notes = `Rejected: ${reason}`;
    }

    return expense.save();
  }

  async markAsPaid(id: string): Promise<Expense> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid expense ID');
    }

    const expense = await this.expenseModel.findById(id);

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== 'approved') {
      throw new BadRequestException('Expense must be approved before marking as paid');
    }

    expense.status = 'paid';

    return expense.save();
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid expense ID');
    }

    const result = await this.expenseModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Expense not found');
    }
  }

  async getStats(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const expenses = await this.expenseModel.find({
      branchId: new Types.ObjectId(branchId),
      date: { $gte: startDate, $lte: endDate },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const approvedExpenses = expenses.filter((e) => e.status === 'approved');
    const paidExpenses = expenses.filter((e) => e.status === 'paid');
    const pendingExpenses = expenses.filter((e) => e.status === 'pending');

    // Group by category
    const byCategory = {};
    expenses.forEach((expense) => {
      if (!byCategory[expense.category]) {
        byCategory[expense.category] = {
          count: 0,
          total: 0,
        };
      }
      byCategory[expense.category].count += 1;
      byCategory[expense.category].total += expense.amount;
    });

    // Group by payment method
    const byPaymentMethod = {};
    expenses.forEach((expense) => {
      if (!byPaymentMethod[expense.paymentMethod]) {
        byPaymentMethod[expense.paymentMethod] = {
          count: 0,
          total: 0,
        };
      }
      byPaymentMethod[expense.paymentMethod].count += 1;
      byPaymentMethod[expense.paymentMethod].total += expense.amount;
    });

    return {
      period: { startDate, endDate },
      total: expenses.length,
      totalAmount: totalExpenses,
      approved: approvedExpenses.length,
      approvedAmount: approvedExpenses.reduce((sum, e) => sum + e.amount, 0),
      paid: paidExpenses.length,
      paidAmount: paidExpenses.reduce((sum, e) => sum + e.amount, 0),
      pending: pendingExpenses.length,
      pendingAmount: pendingExpenses.reduce((sum, e) => sum + e.amount, 0),
      byCategory,
      byPaymentMethod,
      averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
    };
  }

  async getCategoryBreakdown(
    branchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const expenses = await this.expenseModel.find({
      branchId: new Types.ObjectId(branchId),
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'paid'] },
    });

    const breakdown = {};
    
    expenses.forEach((expense) => {
      if (!breakdown[expense.category]) {
        breakdown[expense.category] = {
          category: expense.category,
          count: 0,
          total: 0,
          percentage: 0,
        };
      }
      breakdown[expense.category].count += 1;
      breakdown[expense.category].total += expense.amount;
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate percentages
    Object.values(breakdown).forEach((cat: any) => {
      cat.percentage = total > 0 ? (cat.total / total) * 100 : 0;
    });

    return Object.values(breakdown).sort((a: any, b: any) => b.total - a.total);
  }

  async getMonthlyTrend(
    branchId: string,
    year: number,
  ): Promise<any> {
    const months = [];
    
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const expenses = await this.expenseModel.find({
        branchId: new Types.ObjectId(branchId),
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ['approved', 'paid'] },
      });

      months.push({
        month,
        monthName: startDate.toLocaleString('default', { month: 'short' }),
        count: expenses.length,
        total: expenses.reduce((sum, e) => sum + e.amount, 0),
      });
    }

    return months;
  }

  private async generateExpenseNumber(branchId: string): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');

    const count = await this.expenseModel.countDocuments({
      branchId: new Types.ObjectId(branchId),
    });

    const sequence = String(count + 1).padStart(4, '0');

    return `EXP-${dateStr}-${sequence}`;
  }
}

