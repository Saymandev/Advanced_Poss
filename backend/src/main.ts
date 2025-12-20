import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { EncryptionInterceptor } from './common/interceptors/encryption.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
// import { WinstonLogger } from './common/logger/winston.logger';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Cookie parser (for httpOnly cookies)
  app.use(cookieParser());
  // Increase body size limit to handle large base64 images (50MB)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 5000;
  const frontendUrl = configService.get('APP_URL');
  // Security
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:", "https://unpkg.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https:", "https://unpkg.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }));
  // CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  // Compression
  app.use(compression());
  // Global prefix
  app.setGlobalPrefix('api');
  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  // Static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());
  // Global interceptors
  // Note: Interceptors run in REVERSE order (last registered runs first)
  // So we register EncryptionInterceptor first (runs last), then TransformInterceptor (runs first)
  // This ensures TransformInterceptor wraps the response, then EncryptionInterceptor encrypts it
  app.useGlobalInterceptors(new EncryptionInterceptor(app.get(ConfigService)));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalInterceptors(new LoggingInterceptor());
  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Restaurant POS API')
    .setDescription('Advanced Restaurant Management & POS System API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Companies')
    .addTag('Branches')
    .addTag('Menu')
    .addTag('Orders')
    .addTag('Tables')
    .addTag('Kitchen')
    .addTag('Customers')
    .addTag('Inventory')
    .addTag('Staff')
    .addTag('Reports')
    .addTag('Subscriptions')
    .addTag('AI')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Restaurant POS API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
    },
    customJs: [
      'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js',
    ],
    customCssUrl: [
      'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css',
    ],
  });
  // Health check endpoint
  app.getHttpAdapter().get('/health', (req: any, res: any) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: configService.get('NODE_ENV'),
    });
  });
  // API Health check endpoint
  app.getHttpAdapter().get('/api/health', (req: any, res: any) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: configService.get('NODE_ENV'),
    });
  });
  await app.listen(port);
  }
bootstrap();