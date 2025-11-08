import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API');

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'pin', 'currentPassword', 'newPassword', 'accessToken', 'refreshToken', 'token'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const { method, url, ip, query, params, body, headers } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = request.user?.id || request.user?._id || 'anonymous';
    const userEmail = request.user?.email || 'N/A';
    const userRole = request.user?.role || 'N/A';

    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Log incoming request
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`📥 INCOMING REQUEST`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`⏰ Time: ${timestamp}`);
    this.logger.log(`🔵 Method: ${method}`);
    this.logger.log(`📍 URL: ${url}`);
    this.logger.log(`🌐 IP: ${ip}`);
    this.logger.log(`👤 User ID: ${userId}`);
    this.logger.log(`📧 User Email: ${userEmail}`);
    this.logger.log(`🎭 User Role: ${userRole}`);
    this.logger.log(`🖥️  User Agent: ${userAgent}`);
    
    if (Object.keys(query || {}).length > 0) {
      this.logger.log(`🔍 Query Params: ${JSON.stringify(query, null, 2)}`);
    }
    
    if (Object.keys(params || {}).length > 0) {
      this.logger.log(`📝 Route Params: ${JSON.stringify(params, null, 2)}`);
    }
    
    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.log(`📦 Request Body: ${JSON.stringify(sanitizedBody, null, 2)}`);
    }
    
    if (headers.authorization) {
      const authHeader = headers.authorization;
      const tokenPreview = authHeader.substring(0, 20) + '...';
      this.logger.log(`🔐 Authorization: ${tokenPreview}`);
    }

    return next.handle().pipe(
      tap((responseData) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const { statusCode } = response;

        // Log successful response
        this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        this.logger.log(`📤 OUTGOING RESPONSE`);
        this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        this.logger.log(`✅ Status: ${statusCode}`);
        this.logger.log(`⏱️  Duration: ${duration}ms`);
        this.logger.log(`📊 Response Size: ${JSON.stringify(responseData || {}).length} bytes`);
        
        // Log response data (sanitized)
        if (responseData && typeof responseData === 'object') {
          const sanitizedResponse = this.sanitizeBody(responseData);
          const responsePreview = JSON.stringify(sanitizedResponse, null, 2);
          // Truncate if too long (first 500 chars)
          if (responsePreview.length > 500) {
            this.logger.log(`📦 Response Data (preview): ${responsePreview.substring(0, 500)}...`);
          } else {
            this.logger.log(`📦 Response Data: ${responsePreview}`);
          }
        }
        
        this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }),
      catchError((error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const statusCode = error.status || error.statusCode || 500;

        // Log error response
        this.logger.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        this.logger.error(`❌ ERROR RESPONSE`);
        this.logger.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        this.logger.error(`🔴 Status: ${statusCode}`);
        this.logger.error(`⏱️  Duration: ${duration}ms`);
        this.logger.error(`📛 Error Message: ${error.message || 'Unknown error'}`);
        this.logger.error(`📋 Error Stack: ${error.stack || 'No stack trace'}`);
        if (error.response) {
          this.logger.error(`📦 Error Response: ${JSON.stringify(error.response, null, 2)}`);
        }
        this.logger.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        return throwError(() => error);
      }),
    );
  }
}

