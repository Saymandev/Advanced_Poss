import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ContactForm, ContactFormDocument } from '../public/schemas/contact-form.schema';
import { UpdateContactFormDto } from './dto/update-contact-form.dto';
@Injectable()
export class ContactFormsService {
  constructor(
    @InjectModel(ContactForm.name)
    private contactFormModel: Model<ContactFormDocument>,
  ) {}
  async findAll(filters: {
    companyId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        companyId,
        status,
        search,
        page = 1,
        limit = 20,
      } = filters;
      const query: any = { isActive: true };
      // Filter by companyId (null for general inquiries, specific ID for company-specific)
      if (companyId !== undefined) {
        if (companyId === null || companyId === 'null') {
          query.companyId = null;
        } else {
          // Convert to ObjectId for proper MongoDB comparison
          // Use $in to match both ObjectId and string formats for compatibility
          try {
            const companyIdObj = new Types.ObjectId(companyId);
            query.companyId = { $in: [companyIdObj, companyId] };
          } catch (error) {
            // If companyId is not a valid ObjectId format, use string comparison
            query.companyId = companyId;
          }
        }
      }
      // Filter by status
      if (status) {
        query.status = status;
      }
      // Search by name, email, subject, or message
      // MongoDB will AND this $or with other query conditions automatically
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } },
        ];
      }
      const skip = (page - 1) * limit;
      // Debug logging
      
      const [data, total] = await Promise.all([
        this.contactFormModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('companyId', 'name slug')
          .populate('readBy', 'firstName lastName email')
          .lean()
          .exec(),
        this.contactFormModel.countDocuments(query),
      ]);
      return {
        success: true,
        data: data.map((form: any) => ({
          id: form._id?.toString() || form.id,
          companyId: form.companyId?._id?.toString() || form.companyId?.id || null,
          company: form.companyId
            ? {
                id: form.companyId._id?.toString() || form.companyId.id,
                name: form.companyId.name,
                slug: form.companyId.slug,
              }
            : null,
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: form.subject,
          message: form.message,
          status: form.status,
          readAt: form.readAt,
          readBy: form.readBy
            ? {
                id: form.readBy._id?.toString() || form.readBy.id,
                firstName: form.readBy.firstName,
                lastName: form.readBy.lastName,
                email: form.readBy.email,
              }
            : null,
          adminNotes: form.adminNotes,
          createdAt: form.createdAt,
          updatedAt: form.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to fetch contact forms',
      );
    }
  }
  async findOne(id: string) {
    try {
      const contactForm = await this.contactFormModel
        .findById(id)
        .populate('companyId', 'name slug')
        .populate('readBy', 'firstName lastName email')
        .lean()
        .exec();
      if (!contactForm) {
        throw new NotFoundException('Contact form not found');
      }
      return {
        success: true,
        data: {
          id: (contactForm as any)._id?.toString() || (contactForm as any).id,
          companyId: (contactForm as any).companyId?._id?.toString() || (contactForm as any).companyId?.id || null,
          company: (contactForm as any).companyId
            ? {
                id: (contactForm as any).companyId._id?.toString() || (contactForm as any).companyId.id,
                name: (contactForm as any).companyId.name,
                slug: (contactForm as any).companyId.slug,
              }
            : null,
          name: (contactForm as any).name,
          email: (contactForm as any).email,
          phone: (contactForm as any).phone,
          subject: (contactForm as any).subject,
          message: (contactForm as any).message,
          status: (contactForm as any).status,
          readAt: (contactForm as any).readAt,
          readBy: (contactForm as any).readBy
            ? {
                id: (contactForm as any).readBy._id?.toString() || (contactForm as any).readBy.id,
                firstName: (contactForm as any).readBy.firstName,
                lastName: (contactForm as any).readBy.lastName,
                email: (contactForm as any).readBy.email,
              }
            : null,
          adminNotes: (contactForm as any).adminNotes,
          createdAt: (contactForm as any).createdAt,
          updatedAt: (contactForm as any).updatedAt,
        },
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Failed to fetch contact form',
      );
    }
  }
  async update(id: string, updateDto: UpdateContactFormDto, userId: string) {
    try {
      const contactForm = await this.contactFormModel.findById(id).exec();
      if (!contactForm) {
        throw new NotFoundException('Contact form not found');
      }
      const updateData: any = {};
      if (updateDto.status !== undefined) {
        updateData.status = updateDto.status;
        // If marking as read, set readAt and readBy
        if (updateDto.status === 'read' && !contactForm.readAt) {
          updateData.readAt = new Date();
          updateData.readBy = new Types.ObjectId(userId);
        }
      }
      if (updateDto.adminNotes !== undefined) {
        updateData.adminNotes = updateDto.adminNotes;
      }
      const updated = await this.contactFormModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .populate('companyId', 'name slug')
        .populate('readBy', 'firstName lastName email')
        .lean()
        .exec();
      return {
        success: true,
        message: 'Contact form updated successfully',
        data: {
          id: (updated as any)._id?.toString() || (updated as any).id,
          companyId: (updated as any).companyId?._id?.toString() || (updated as any).companyId?.id || null,
          company: (updated as any).companyId
            ? {
                id: (updated as any).companyId._id?.toString() || (updated as any).companyId.id,
                name: (updated as any).companyId.name,
                slug: (updated as any).companyId.slug,
              }
            : null,
          name: (updated as any).name,
          email: (updated as any).email,
          phone: (updated as any).phone,
          subject: (updated as any).subject,
          message: (updated as any).message,
          status: (updated as any).status,
          readAt: (updated as any).readAt,
          readBy: (updated as any).readBy
            ? {
                id: (updated as any).readBy._id?.toString() || (updated as any).readBy.id,
                firstName: (updated as any).readBy.firstName,
                lastName: (updated as any).readBy.lastName,
                email: (updated as any).readBy.email,
              }
            : null,
          adminNotes: (updated as any).adminNotes,
          createdAt: (updated as any).createdAt,
          updatedAt: (updated as any).updatedAt,
        },
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Failed to update contact form',
      );
    }
  }
  async getStats(companyId?: string) {
    try {
      const query: any = { isActive: true };
      if (companyId !== undefined) {
        if (companyId === null || companyId === 'null') {
          query.companyId = null;
        } else {
          query.companyId = new Types.ObjectId(companyId);
        }
      }
      const [total, newCount, readCount, repliedCount, archivedCount] = await Promise.all([
        this.contactFormModel.countDocuments(query),
        this.contactFormModel.countDocuments({ ...query, status: 'new' }),
        this.contactFormModel.countDocuments({ ...query, status: 'read' }),
        this.contactFormModel.countDocuments({ ...query, status: 'replied' }),
        this.contactFormModel.countDocuments({ ...query, status: 'archived' }),
      ]);
      return {
        success: true,
        data: {
          total,
          new: newCount,
          read: readCount,
          replied: repliedCount,
          archived: archivedCount,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(
        error.message || 'Failed to fetch contact form statistics',
      );
    }
  }
}
