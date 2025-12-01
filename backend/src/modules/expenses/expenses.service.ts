import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExpenseFilterDto } from '../../common/dto/pagination.dto';
import { isSuperAdmin } from '../../common/utils/query.utils';
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

    const expenseData: any = {
      ...createExpenseDto,
      expenseNumber,
      status: 'pending',
    };

    // Convert string IDs to ObjectIds
    if (expenseData.companyId && typeof expenseData.companyId === 'string') {
      expenseData.companyId = new Types.ObjectId(expenseData.companyId);
    }
    if (expenseData.branchId && typeof expenseData.branchId === 'string') {
      expenseData.branchId = new Types.ObjectId(expenseData.branchId);
    }
    if (expenseData.createdBy && typeof expenseData.createdBy === 'string') {
      expenseData.createdBy = new Types.ObjectId(expenseData.createdBy);
    }
    if (expenseData.supplierId && typeof expenseData.supplierId === 'string') {
      expenseData.supplierId = new Types.ObjectId(expenseData.supplierId);
    }
    if (expenseData.purchaseOrderId && typeof expenseData.purchaseOrderId === 'string') {
      expenseData.purchaseOrderId = new Types.ObjectId(expenseData.purchaseOrderId);
    }

    const expense = new this.expenseModel(expenseData);

    return expense.save();
  }

  async findAll(filterDto: ExpenseFilterDto, userRole?: string): Promise<{ expenses: Expense[], total: number, page: number, limit: number }> {
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

    // Apply company filter based on user role
    // Super admin can query all companies if no companyId provided
    if (isSuperAdmin(userRole)) {
      // Only filter by companyId if explicitly provided
      if (companyId) {
        query.companyId = typeof companyId === 'string' 
          ? new Types.ObjectId(companyId) 
          : companyId;
      }
    } else {
      // Non-super-admin users must filter by companyId
      if (!companyId) {
        throw new BadRequestException('Company ID is required');
      }
      query.companyId = typeof companyId === 'string' 
        ? new Types.ObjectId(companyId) 
        : companyId;
    }

    // Apply branch filter (super admin can query all branches if no branchId provided)
    if (branchId) {
      query.branchId = typeof branchId === 'string' 
        ? new Types.ObjectId(branchId) 
        : branchId;
    } else if (!isSuperAdmin(userRole)) {
      // Non-super-admin users typically need branchId, but we'll allow it to be optional for now
      // You can add validation here if needed
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    // Add date range filtering
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

    // Add search functionality
    if (search) {
      const searchConditions = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { vendorName: { $regex: search, $options: 'i' } },
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { expenseNumber: { $regex: search, $options: 'i' } },
        ],
      };
      
      if (Object.keys(query).length > 0) {
        query.$and = [
          { ...query },
          searchConditions,
        ];
        // Remove $or from top level if it exists
        delete query.$or;
      } else {
        Object.assign(query, searchConditions);
      }
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    console.log('🔍 ExpensesService.findAll query:', JSON.stringify(query, null, 2));
    console.log('🔍 ExpensesService.findAll filters:', { page, limit, sortBy, sortOrder, search });

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

    console.log(`✅ ExpensesService.findAll found ${expenses.length} expenses`);

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

