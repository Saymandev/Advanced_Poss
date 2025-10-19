import {
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const { req, res } = this.getRequestResponse(context);

    // Get client identifier (IP or user ID)
    const key = this.generateKey(context, req.ip);

    // Check rate limit
    const { totalHits, timeToExpire } = await this.storageService.increment(
      key,
      ttl,
    );

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - totalHits));
    res.setHeader('X-RateLimit-Reset', Date.now() + timeToExpire);

    if (totalHits > limit) {
      res.setHeader('Retry-After', timeToExpire);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          error: 'ThrottlerException',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  protected getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp();
    return {
      req: http.getRequest(),
      res: http.getResponse(),
    };
  }

  protected generateKey(context: ExecutionContext, suffix: string): string {
    const req = context.switchToHttp().getRequest();
    const route = req.route?.path || req.url;
    const method = req.method;

    // Use user ID if authenticated, otherwise use IP
    const userId = req.user?._id || suffix;

    return `throttle:${method}:${route}:${userId}`;
  }
}

