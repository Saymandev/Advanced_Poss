import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
}
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Log what we receive
        const request = context.switchToHttp().getRequest();
        const url = request.url || '';
        if (url.includes('/rooms')) {
          // Debug logging for rooms endpoint
        }
        // If data already has success property, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        // Transform data to standard response format
        const response = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
        if (url.includes('/rooms')) {
          // Debug logging for rooms endpoint
        }
        return response;
      }),
    );
  }
}
