import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';

import { getModelToken } from '@nestjs/mongoose';
import { PaymentMethod } from '../payment-methods/schemas/payment-method.schema';
import { Transaction } from './schemas/transaction.schema';
import { WorkPeriodsService } from '../work-periods/work-periods.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(Transaction.name),
          useValue: {}, // mock mongoose model methods as needed
        },
        {
          provide: getModelToken(PaymentMethod.name),
          useValue: {},
        },
        {
          provide: WorkPeriodsService,
          useValue: {}, // mock service methods as needed
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
