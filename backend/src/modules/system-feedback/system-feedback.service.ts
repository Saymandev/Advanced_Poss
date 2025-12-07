import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSystemFeedbackDto } from './dto/create-system-feedback.dto';
import {
    FeedbackType,
    SystemFeedback,
    SystemFeedbackDocument,
} from './schemas/system-feedback.schema';

@Injectable()
export class SystemFeedbackService {
  constructor(
    @InjectModel(SystemFeedback.name)
    private feedbackModel: Model<SystemFeedbackDocument>,
  ) {}

  async create(
    createFeedbackDto: CreateSystemFeedbackDto,
    userId: string,
    companyId: string,
  ): Promise<SystemFeedback> {
    const feedback = new this.feedbackModel({
      ...createFeedbackDto,
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      type: createFeedbackDto.type || FeedbackType.FEEDBACK,
      isPublic: createFeedbackDto.isPublic ?? true,
      isAnonymous: createFeedbackDto.isAnonymous ?? false,
    });

    return feedback.save();
  }

  async findAll(filter: {
    companyId?: string;
    userId?: string;
    type?: FeedbackType;
    isPublic?: boolean;
    limit?: number;
  }): Promise<SystemFeedback[]> {
    const query: any = { isActive: true };

    if (filter.companyId) {
      query.companyId = new Types.ObjectId(filter.companyId);
    }

    if (filter.userId) {
      query.userId = new Types.ObjectId(filter.userId);
    }

    if (filter.type) {
      query.type = filter.type;
    }

    if (filter.isPublic !== undefined) {
      query.isPublic = filter.isPublic;
    }

    let queryBuilder = this.feedbackModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email')
      .populate('companyId', 'name')
      .populate('respondedBy', 'firstName lastName');

    if (filter.limit) {
      queryBuilder = queryBuilder.limit(filter.limit);
    }

    return queryBuilder.exec();
  }

  async findOne(id: string): Promise<SystemFeedback> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid feedback ID');
    }

    const feedback = await this.feedbackModel
      .findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('companyId', 'name')
      .populate('respondedBy', 'firstName lastName')
      .exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  async getPublicTestimonials(limit: number = 10): Promise<SystemFeedback[]> {
    return this.feedbackModel
      .find({
        isActive: true,
        isPublic: true,
        rating: { $gte: 4 }, // Only show 4+ star reviews
      })
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit)
      .populate('userId', 'firstName lastName')
      .populate('companyId', 'name')
      .exec();
  }

  async getPublicStats(): Promise<{
    totalCompanies: number;
    activeCompanies: number;
    totalUsers: number;
    averageRating: number;
    totalFeedback: number;
  }> {
    // This will be called from public service
    // For now, return basic stats
    const [totalFeedback, feedbackStats] = await Promise.all([
      this.feedbackModel.countDocuments({ isActive: true, isPublic: true }).exec(),
      this.feedbackModel
        .aggregate([
          { $match: { isActive: true, isPublic: true } },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
              total: { $sum: 1 },
            },
          },
        ])
        .exec(),
    ]);

    const stats = feedbackStats[0] || { averageRating: 0, total: 0 };

    return {
      totalCompanies: 0, // Will be populated by public service
      activeCompanies: 0,
      totalUsers: 0,
      averageRating: Math.round((stats.averageRating || 0) * 10) / 10,
      totalFeedback,
    };
  }

  async respondToFeedback(
    id: string,
    response: string,
    respondedBy: string,
  ): Promise<SystemFeedback> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid feedback ID');
    }

    const feedback = await this.feedbackModel.findById(id);

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    feedback.response = response;
    feedback.respondedBy = new Types.ObjectId(respondedBy);
    feedback.respondedAt = new Date();
    feedback.isResolved = true;

    return feedback.save();
  }

  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid feedback ID');
    }

    const feedback = await this.feedbackModel.findById(id);

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    feedback.isActive = false;
    await feedback.save();
  }
}

