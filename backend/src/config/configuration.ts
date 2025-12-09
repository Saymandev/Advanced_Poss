export default () => ({
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
// 12-09-2025
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_pos',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/restaurant_pos_test',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    ttl: parseInt(process.env.REDIS_TTL, 10) || 300,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@restaurantpos.com',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceIdBasic: process.env.STRIPE_PRICE_ID_BASIC,
    priceIdPremium: process.env.STRIPE_PRICE_ID_PREMIUM,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  frontend: {
    url: process.env.APP_URL || 'http://localhost:3000',
  },

  backup: {
    dir: process.env.BACKUP_DIR || './backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30,
  },

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@restaurantpos.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
    firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
    lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
  },
});

