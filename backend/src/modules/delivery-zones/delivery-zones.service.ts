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
      lat?: number;
      lng?: number;
    },
  ): Promise<DeliveryZone | null> {
    const branchFilter = branchId ? { branchId: new Types.ObjectId(branchId) } : {};

    // If coordinates are provided, check polygon/radius coverage first
    if (address.lat !== undefined && address.lng !== undefined) {
      const zones = await this.zoneModel.find({
        companyId: new Types.ObjectId(companyId),
        ...branchFilter,
        isActive: true,
        'coverageArea.coordinates': { $exists: true, $ne: [] },
      });

      for (const zone of zones) {
        const coverage = zone.coverageArea;
        if (coverage?.type === 'polygon' && coverage.coordinates) {
          if (isPointInPolygon(address.lat, address.lng, coverage.coordinates)) {
            return zone;
          }
        } else if (coverage?.type === 'radius' && coverage.coordinates?.length) {
          const center = coverage.coordinates[0];
          const dist = getDistance(address.lat, address.lng, center[0], center[1]);
          if (dist <= (coverage.radius || 1000)) {
            return zone;
          }
        }
      }
    }

    // Try to find by zip code
    if (address.zipCode) {
      const zone = await this.zoneModel.findOne({
        companyId: new Types.ObjectId(companyId),
        ...branchFilter,
        isActive: true,
        'deliveryAreas.zipCodes': address.zipCode,
      });
      if (zone) return zone;
    }

    // Try to find by city/neighborhood
    if (address.city) {
      const zone = await this.zoneModel.findOne({
        companyId: new Types.ObjectId(companyId),
        ...branchFilter,
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
        ...branchFilter,
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

function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

