import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { DeliveryZone, DeliveryZoneDocument } from './schemas/delivery-zone.schema';

@Injectable()
export class DeliveryZonesService {
  constructor(
    @InjectModel(DeliveryZone.name)
    private zoneModel: Model<DeliveryZoneDocument>,
  ) {}

  async create(createZoneDto: CreateDeliveryZoneDto): Promise<DeliveryZone> {
    const zone = new this.zoneModel({
      ...createZoneDto,
      companyId: createZoneDto.companyId ? new Types.ObjectId(createZoneDto.companyId) : undefined,
      branchId: createZoneDto.branchId ? new Types.ObjectId(createZoneDto.branchId) : undefined,
    });

    return zone.save();
  }

  async findAll(filter: any = {}): Promise<DeliveryZone[]> {
    return this.zoneModel
      .find(filter)
      .populate('companyId', 'name')
      .populate('branchId', 'name')
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findByCompany(companyId: string): Promise<DeliveryZone[]> {
    return this.zoneModel
      .find({ companyId: new Types.ObjectId(companyId), isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findByBranch(branchId: string): Promise<DeliveryZone[]> {
    return this.zoneModel
      .find({ branchId: new Types.ObjectId(branchId), isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async findOne(id: string): Promise<DeliveryZone> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const zone = await this.zoneModel.findById(id);

    if (!zone) {
      throw new NotFoundException('Delivery zone not found');
    }

    return zone;
  }

  async findZoneByAddress(
    companyId: string,
    branchId: string,
    address: {
      zipCode?: string;
      city?: string;
      street?: string;
    },
  ): Promise<DeliveryZone | null> {
    // First, try to find by zip code
    if (address.zipCode) {
      const zone = await this.zoneModel.findOne({
        companyId: new Types.ObjectId(companyId),
        branchId: branchId ? new Types.ObjectId(branchId) : { $exists: true },
        isActive: true,
        'deliveryAreas.zipCodes': address.zipCode,
      });

      if (zone) return zone;
    }

    // Try to find by city/neighborhood
    if (address.city) {
      const zone = await this.zoneModel.findOne({
        companyId: new Types.ObjectId(companyId),
        branchId: branchId ? new Types.ObjectId(branchId) : { $exists: true },
        isActive: true,
        $or: [
          { 'deliveryAreas.neighborhoods': { $in: [address.city] } },
          { areas: { $in: [address.city] } },
        ],
      });

      if (zone) return zone;
    }

    // Return default zone (lowest charge or first zone)
    const defaultZone = await this.zoneModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        branchId: branchId ? new Types.ObjectId(branchId) : { $exists: true },
        isActive: true,
      })
      .sort({ deliveryCharge: 1, sortOrder: 1 })
      .exec();

    return defaultZone;
  }

  async update(id: string, updateZoneDto: UpdateDeliveryZoneDto): Promise<DeliveryZone> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const zone = await this.zoneModel.findByIdAndUpdate(
      id,
      {
        ...updateZoneDto,
        companyId: updateZoneDto.companyId ? new Types.ObjectId(updateZoneDto.companyId) : undefined,
        branchId: updateZoneDto.branchId ? new Types.ObjectId(updateZoneDto.branchId) : undefined,
      },
      { new: true },
    );

    if (!zone) {
      throw new NotFoundException('Delivery zone not found');
    }

    return zone;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }

    const result = await this.zoneModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Delivery zone not found');
    }
  }
}

