import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BusinessCategory, BusinessCategoryDocument } from './schemas/business-category.schema';

@Injectable()
export class BusinessCategoriesService implements OnModuleInit {
  constructor(
    @InjectModel(BusinessCategory.name)
    private businessCategoryModel: Model<BusinessCategoryDocument>,
  ) {}

  async onModuleInit() {
    await this.seedCategories();
  }

  async findAllActive(): Promise<BusinessCategory[]> {
    return this.businessCategoryModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  private async seedCategories() {
    const count = await this.businessCategoryModel.countDocuments();
    if (count === 0) {
      console.log('Seeding default business categories...');
      
      const defaultCategories = [
        // Hospitality
        { name: 'Restaurant', code: 'restaurant', businessType: 'restaurant' },
        { name: 'Café', code: 'cafe', businessType: 'restaurant' },
        { name: 'Bakery', code: 'bakery', businessType: 'restaurant' },
        { name: 'Bar', code: 'bar', businessType: 'restaurant' },
        { name: 'Food Truck', code: 'food_truck', businessType: 'restaurant' },
        { name: 'Other Food Business', code: 'other', businessType: 'restaurant' },
        
        // Retail
        { name: 'General Retail', code: 'retail', businessType: 'retail' },
        { name: 'Grocery & Supermarket', code: 'grocery', businessType: 'retail' },
        { name: 'Clothing & Fashion', code: 'clothing', businessType: 'retail' },
        { name: 'Electronics & IT', code: 'electronics', businessType: 'retail' },
        { name: 'Other Retail', code: 'other_retail', businessType: 'retail' },
      ];

      await this.businessCategoryModel.insertMany(defaultCategories);
      console.log('Default business categories seeded successfully.');
    }
  }
}
