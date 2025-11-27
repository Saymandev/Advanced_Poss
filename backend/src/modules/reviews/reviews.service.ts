import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomersService } from '../customers/customers.service';
import { POSOrder, POSOrderDocument } from '../pos/schemas/pos-order.schema';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review, ReviewDocument } from './schemas/review.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(POSOrder.name) private posOrderModel: Model<POSOrderDocument>,
    private customersService: CustomersService,
    private websocketsGateway: WebsocketsGateway,
  ) {}

  async create(createReviewDto: CreateReviewDto, branchId: string, companyId: string): Promise<Review> {
    // Verify order exists and belongs to branch - populate userId to get waiter info
    const order = await this.posOrderModel
      .findById(createReviewDto.orderId)
      .populate('userId', 'firstName lastName name email')
      .populate('items.menuItemId', 'name')
      .exec();
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.branchId.toString() !== branchId) {
      throw new BadRequestException('Order does not belong to this branch');
    }

    // Check if review already exists for this order
    const existingReview = await this.reviewModel.findOne({
      orderId: new Types.ObjectId(createReviewDto.orderId),
    }).exec();

    if (existingReview) {
      throw new BadRequestException('Review already exists for this order');
    }

    // Find or create customer if email provided
    let customerId: Types.ObjectId | undefined;
    if (createReviewDto.customerEmail) {
      try {
        const customer = await this.customersService.findByEmail(
          branchId,
          createReviewDto.customerEmail,
        );
        if (customer) {
          customerId = (customer as any)._id || (customer as any).id;
        } else if (createReviewDto.customerName) {
          // Create customer if doesn't exist
          const newCustomer = await this.customersService.create({
            companyId,
            branchId,
            firstName: createReviewDto.customerName.split(' ')[0] || createReviewDto.customerName,
            lastName: createReviewDto.customerName.split(' ').slice(1).join(' ') || '',
            email: createReviewDto.customerEmail,
          });
          customerId = (newCustomer as any)._id || (newCustomer as any).id;
        }
      } catch (error) {
        // If customer creation fails, continue without customerId
        console.error('Customer creation failed:', error);
      }
    }

    // Get waiter ID from order - safely extract from populated or non-populated userId
    let waiterId: string | undefined = undefined;
    if (order.userId) {
      if (typeof order.userId === 'object' && order.userId !== null) {
        waiterId = (order.userId as any)._id?.toString() || 
                   (order.userId as any).id?.toString() || 
                   String((order.userId as any)._id || (order.userId as any).id);
      } else {
        waiterId = String(order.userId);
      }
    }

    // Validate and convert menuItemIds for itemReviews
    const itemReviews = createReviewDto.itemReviews?.map(item => {
      let menuItemIdObj: Types.ObjectId;
      try {
        // Try to convert to ObjectId
        if (Types.ObjectId.isValid(item.menuItemId)) {
          menuItemIdObj = new Types.ObjectId(item.menuItemId);
        } else {
          console.error(`Invalid menuItemId: ${item.menuItemId}`);
          return null;
        }
      } catch (error) {
        console.error(`Error converting menuItemId to ObjectId: ${item.menuItemId}`, error);
        return null;
      }

      return {
        menuItemId: menuItemIdObj,
        menuItemName: item.menuItemName || 'Unknown Item',
        rating: item.rating,
        comment: item.comment || '',
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null) || [];

    const review = new this.reviewModel({
      companyId: new Types.ObjectId(companyId),
      branchId: new Types.ObjectId(branchId),
      orderId: new Types.ObjectId(createReviewDto.orderId),
      customerId,
      customerName: createReviewDto.customerName,
      customerEmail: createReviewDto.customerEmail,
      waiterId: waiterId ? new Types.ObjectId(waiterId) : undefined,
      waiterRating: createReviewDto.waiterRating,
      foodRating: createReviewDto.foodRating,
      ambianceRating: createReviewDto.ambianceRating,
      overallRating: createReviewDto.overallRating,
      comment: createReviewDto.comment,
      itemReviews: itemReviews.length > 0 ? itemReviews : undefined,
      isPublished: true,
    });

    const savedReview = await review.save();

    // Send WebSocket notification to branch
    try {
      const order = await this.posOrderModel.findById(createReviewDto.orderId).select('orderNumber').exec();
      const orderNumber = order?.orderNumber || createReviewDto.orderId.slice(-8);
      
      this.websocketsGateway.notifySystemNotification(branchId, {
        type: 'review',
        title: 'New Review Received',
        message: `${createReviewDto.customerName || 'Customer'} left a ${createReviewDto.overallRating}-star review for Order #${orderNumber}`,
        data: {
          reviewId: savedReview._id.toString(),
          orderId: createReviewDto.orderId,
          orderNumber,
          customerName: createReviewDto.customerName,
          overallRating: createReviewDto.overallRating,
          foodRating: createReviewDto.foodRating,
          waiterRating: createReviewDto.waiterRating,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      // Don't fail review creation if notification fails
      console.error('Failed to send review notification:', error);
    }

    return savedReview;
  }

  async findAll(branchId?: string, companyId?: string): Promise<Review[]> {
    const query: any = {};
    
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }
    
    if (companyId) {
      query.companyId = new Types.ObjectId(companyId);
    }

    return this.reviewModel
      .find(query)
      .populate('customerId', 'firstName lastName email')
      .populate('waiterId', 'firstName lastName')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewModel
      .findById(id)
      .populate('customerId', 'firstName lastName email')
      .populate('waiterId', 'firstName lastName')
      .populate('orderId', 'orderNumber')
      .exec();
    
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    
    return review;
  }

  async findByOrder(orderId: string): Promise<Review | null> {
    return this.reviewModel
      .findOne({ orderId: new Types.ObjectId(orderId) })
      .populate('customerId', 'firstName lastName email')
      .populate('waiterId', 'firstName lastName')
      .populate('orderId', 'orderNumber')
      .exec();
  }

  // Get average rating for a specific menu item
  async getMenuItemRating(menuItemId: string, branchId?: string, companyId?: string): Promise<{ averageRating: number; totalReviews: number }> {
    const query: any = {
      'itemReviews.menuItemId': new Types.ObjectId(menuItemId),
    };

    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }

    if (companyId) {
      query.companyId = new Types.ObjectId(companyId);
    }

    const reviews = await this.reviewModel.find(query).exec();
    
    const itemRatings: number[] = [];
    reviews.forEach((review) => {
      if (review.itemReviews && Array.isArray(review.itemReviews)) {
        review.itemReviews.forEach((itemReview: any) => {
          const itemId = itemReview.menuItemId?.toString() || 
                        (itemReview.menuItemId?._id?.toString()) ||
                        String(itemReview.menuItemId);
          if (itemId === menuItemId && itemReview.rating) {
            itemRatings.push(itemReview.rating);
          }
        });
      }
    });

    if (itemRatings.length === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    const averageRating = itemRatings.reduce((sum, rating) => sum + rating, 0) / itemRatings.length;
    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews: itemRatings.length,
    };
  }

  // Get ratings summary for multiple menu items
  async getMenuItemsRatings(menuItemIds: string[], branchId?: string, companyId?: string): Promise<Record<string, { averageRating: number; totalReviews: number }>> {
    const query: any = {
      'itemReviews.menuItemId': { $in: menuItemIds.map(id => new Types.ObjectId(id)) },
    };

    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }

    if (companyId) {
      query.companyId = new Types.ObjectId(companyId);
    }

    const reviews = await this.reviewModel.find(query).exec();
    
    const ratingsMap: Record<string, number[]> = {};
    menuItemIds.forEach(id => {
      ratingsMap[id] = [];
    });

    reviews.forEach((review) => {
      if (review.itemReviews && Array.isArray(review.itemReviews)) {
        review.itemReviews.forEach((itemReview: any) => {
          const itemId = itemReview.menuItemId?.toString() || 
                        (itemReview.menuItemId?._id?.toString()) ||
                        String(itemReview.menuItemId);
          if (ratingsMap[itemId] && itemReview.rating) {
            ratingsMap[itemId].push(itemReview.rating);
          }
        });
      }
    });

    const result: Record<string, { averageRating: number; totalReviews: number }> = {};
    Object.keys(ratingsMap).forEach((menuItemId) => {
      const ratings = ratingsMap[menuItemId];
      if (ratings.length === 0) {
        result[menuItemId] = { averageRating: 0, totalReviews: 0 };
      } else {
        const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        result[menuItemId] = {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: ratings.length,
        };
      }
    });

    return result;
  }
}

