import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

@Injectable()
export class ObjectIdValidationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const checkIds = (obj: any) => {
      if (!obj) return;
      const keysToCheck = ['branchId', 'companyId', 'id', 'userId', 'customerId'];
      
      for (const key of keysToCheck) {
        if (obj[key]) {
          // If it's an array of IDs
          if (Array.isArray(obj[key])) {
            for (const id of obj[key]) {
              if (typeof id === 'string' && !Types.ObjectId.isValid(id)) {
                throw new BadRequestException(`Invalid ObjectId format for ${key}: ${id}`);
              }
            }
          } 
          // If it's a single string ID
          else if (typeof obj[key] === 'string' && !Types.ObjectId.isValid(obj[key])) {
            throw new BadRequestException(`Invalid ObjectId format for ${key}: ${obj[key]}`);
          }
        }
      }
    };

    try {
      checkIds(req.params);
      checkIds(req.query);
      checkIds(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }
}
