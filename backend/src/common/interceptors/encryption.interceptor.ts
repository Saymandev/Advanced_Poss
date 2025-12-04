import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

   constructor(private readonly configService: ConfigService) {
     const secret = this.configService.get<string>('RESPONSE_ENCRYPTION_KEY');
 
     if (!secret || secret.length === 0) {
       // Derive a key from an empty/default string to avoid hard-crash in dev,
       // but log a clear warning so production can be configured properly.
       console.warn(
         '⚠️ RESPONSE_ENCRYPTION_KEY is not set. Using a weak default key. DO NOT USE IN PRODUCTION.',
       );
     }
 
     const base = secret || 'default-weak-key-change-me';
     // Derive a 32-byte key (AES-256) from the secret using PBKDF2 so it matches frontend
     this.key = crypto.pbkdf2Sync(
       base,
       'response-encryption-salt',
       1000,
       32,
       'sha256',
     );
   }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { url?: string }>();
    const url = (request as any).url || '';

    // Skip encryption for Swagger docs and health endpoints
    if (
      url.startsWith('/api/docs') ||
      url.startsWith('/docs') ||
      url.startsWith('/health') ||
      url.startsWith('/api/health')
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // Only encrypt JSON-like responses (objects/arrays)
        if (data === null || data === undefined) {
          return data;
        }

        const payload =
          typeof data === 'string' ? data : JSON.stringify(data);

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(payload, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        return {
          encrypted: true,
          iv: iv.toString('base64'),
          data: encrypted,
        };
      }),
    );
  }
}


