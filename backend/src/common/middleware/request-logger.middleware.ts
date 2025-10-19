import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
// import { WinstonLoggerService } from '../logger/winston.logger';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  // private readonly logger = new WinstonLoggerService('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      const logMessage = `${method} ${originalUrl} ${statusCode} ${responseTime}ms - ${ip} - ${userAgent}`;

      if (statusCode >= 500) {
        console.error(logMessage);
      } else if (statusCode >= 400) {
        console.warn(logMessage);
      } else {
        console.log(logMessage);
      }
    });

    next();
  }
}

