import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { TransactionsService } from '../transactions/transactions.service';
import { WorkPeriodsService } from '../work-periods/work-periods.service';
import { IncomesService } from './incomes.service';
import { Income } from './schemas/income.schema';

const mockIncome = {
  _id: new Types.ObjectId(),
  companyId: new Types.ObjectId(),
  branchId: new Types.ObjectId(),
  incomeNumber: 'INC-260517-0001',
  title: 'Test Banquet Rental',
  category: 'event',
  amount: 2500,
  date: new Date(),
  paymentMethod: 'cash',
  createdBy: new Types.ObjectId(),
  status: 'pending',
  save: jest.fn(),
};

class MockModel {
  constructor(private data: any) {
    Object.assign(this, data);
  }
  static countDocuments = jest.fn().mockResolvedValue(0);
  static find = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockIncome]),
  });
  static findById = jest.fn().mockReturnValue({
    populate: jest.fn().mockResolvedValue(mockIncome),
  });
  static findByIdAndUpdate = jest.fn().mockResolvedValue(mockIncome);
  static findByIdAndDelete = jest.fn().mockResolvedValue(mockIncome);
  save() {
    return Promise.resolve(mockIncome);
  }
}

describe('IncomesService', () => {
  let service: IncomesService;
  let transactionsService: jest.Mocked<TransactionsService>;
  let workPeriodsService: jest.Mocked<WorkPeriodsService>;

  beforeEach(async () => {
    const mockTxnService = {
      recordTransaction: jest.fn().mockResolvedValue({}),
    };
    const mockWPService = {
      findActive: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomesService,
        {
          provide: getModelToken(Income.name),
          useValue: MockModel,
        },
        {
          provide: TransactionsService,
          useValue: mockTxnService,
        },
        {
          provide: WorkPeriodsService,
          useValue: mockWPService,
        },
      ],
    }).compile();

    service = module.get<IncomesService>(IncomesService);
    transactionsService = module.get(TransactionsService) as any;
    workPeriodsService = module.get(WorkPeriodsService) as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if not owner/superadmin and no active work period', async () => {
      workPeriodsService.findActive.mockResolvedValueOnce(null);
      await expect(
        service.create(
          {
            companyId: new Types.ObjectId().toString(),
            branchId: new Types.ObjectId().toString(),
            title: 'Test Rental',
            category: 'event',
            amount: 500,
            date: new Date().toISOString(),
            paymentMethod: 'cash',
            createdBy: new Types.ObjectId().toString(),
          },
          'cashier',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record transaction immediately if initial status is received', async () => {
      const savedIncome = { ...mockIncome, status: 'received' };
      jest.spyOn(MockModel.prototype, 'save').mockResolvedValueOnce(savedIncome);

      const res = await service.create(
        {
          companyId: mockIncome.companyId.toString(),
          branchId: mockIncome.branchId.toString(),
          title: 'Test Rental',
          category: 'event',
          amount: 2500,
          date: mockIncome.date.toISOString(),
          paymentMethod: 'cash',
          createdBy: mockIncome.createdBy.toString(),
          status: 'received',
        },
        'owner',
      );

      expect(res.status).toBe('received');
      expect(transactionsService.recordTransaction).toHaveBeenCalled();
    });
  });

  describe('markAsReceived', () => {
    it('should transition status to received and record transaction', async () => {
      const pendingIncome = {
        ...mockIncome,
        status: 'pending',
        save: jest.fn().mockImplementation(function (this: any) {
          this.status = 'received';
          return Promise.resolve(this);
        }),
      };
      MockModel.findById = jest.fn().mockResolvedValueOnce(pendingIncome);

      const res = await service.markAsReceived(pendingIncome._id.toString(), new Types.ObjectId().toString());
      expect(res.status).toBe('received');
      expect(transactionsService.recordTransaction).toHaveBeenCalled();
    });
  });
});
