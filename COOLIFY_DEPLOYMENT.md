# Coolify Deployment Guide

This guide will help you deploy both the backend and frontend to Coolify.

## Prerequisites

1. A Coolify instance running (self-hosted or cloud)
2. MongoDB database (can be deployed on Coolify or external)
3. Redis instance (can be deployed on Coolify or external)
4. Domain names for backend and frontend (optional but recommended)

## Deployment Steps

### 1. Backend Deployment

#### Option A: Using Dockerfile (Recommended)

1. **Create a new resource in Coolify:**
   - Go to your Coolify dashboard
   - Click "New Resource" → "Docker Compose" or "Application"
   - Select "Dockerfile" as the build method

2. **Configure the backend:**
   - **Name:** `restaurant-pos-backend`
   - **Repository:** Your Git repository URL
   - **Branch:** `main` or `master`
   - **Dockerfile Path:** `backend/Dockerfile`
   - **Build Context:** `backend/`
   - **Port:** `5000`

3. **Environment Variables:**
   Add these environment variables in Coolify:

   ```env
   NODE_ENV=production
   PORT=5000
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://username:password@mongodb-host:27017/database?authSource=admin
   
   # Redis Configuration
   REDIS_HOST=redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this
   REFRESH_TOKEN_EXPIRES_IN=30d
   
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   STRIPE_PRICE_BASIC_MONTHLY=price_your_basic_monthly_price_id
   STRIPE_PRICE_PRO_MONTHLY=price_your_pro_monthly_price_id
   STRIPE_PRICE_ENTERPRISE_MONTHLY=price_your_enterprise_monthly_price_id
   
   # Email Configuration (Optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@yourdomain.com
   
   # Cloudinary Configuration (Optional)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Application URLs
   FRONTEND_URL=https://your-frontend-domain.com
   APP_URL=https://your-backend-domain.com
   
   # CORS Configuration
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

4. **Health Check:**
   - **Path:** `/health`
   - **Port:** `5000`

5. **Volumes (Optional):**
   - `/app/uploads` - For file uploads
   - `/app/backups` - For database backups

#### Option B: Using Docker Compose

If you prefer using docker-compose:

1. Create a new resource → Docker Compose
2. Use the provided `docker-compose.yml` file
3. Update environment variables in the compose file

### 2. Frontend Deployment

1. **Create a new resource in Coolify:**
   - Click "New Resource" → "Application"
   - Select "Dockerfile" as the build method

2. **Configure the frontend:**
   - **Name:** `restaurant-pos-frontend`
   - **Repository:** Your Git repository URL
   - **Branch:** `main` or `master`
   - **Dockerfile Path:** `frontend/Dockerfile`
   - **Build Context:** `frontend/`
   - **Port:** `3000`

3. **Environment Variables:**
   Add these environment variables:

   ```env
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
   NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.com
   ```

4. **Build Arguments:**
   - `NEXT_PUBLIC_API_URL` - Your backend API URL

### 3. Database Setup

#### MongoDB on Coolify

1. Create a new resource → Database → MongoDB
2. Note the connection string
3. Update `MONGODB_URI` in backend environment variables

#### External MongoDB

Use MongoDB Atlas or another MongoDB provider:
- Update `MONGODB_URI` with your connection string

### 4. Redis Setup

#### Redis on Coolify

1. Create a new resource → Database → Redis
2. Note the host, port, and password
3. Update Redis environment variables in backend

#### External Redis

Use a Redis provider or self-hosted Redis:
- Update `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`

### 5. Domain Configuration

1. **Backend Domain:**
   - Add your domain in Coolify
   - Point DNS A record to Coolify server IP
   - Enable SSL/TLS (Coolify handles this automatically)

2. **Frontend Domain:**
   - Add your domain in Coolify
   - Point DNS A record to Coolify server IP
   - Enable SSL/TLS

### 6. Post-Deployment Steps

1. **Seed Database:**
   ```bash
   # SSH into backend container or use Coolify's terminal
   npm run seed
   npm run create-super-admin
   ```

2. **Verify Health Checks:**
   - Backend: `https://your-backend-domain.com/health`
   - Frontend: `https://your-frontend-domain.com`

3. **Update Stripe Webhook:**
   - Go to Stripe Dashboard → Webhooks
   - Add webhook URL: `https://your-backend-domain.com/api/v1/subscription-payments/webhook`
   - Copy webhook secret and update `STRIPE_WEBHOOK_SECRET`

## Troubleshooting

### Backend Issues

1. **Build Fails:**
   - Check Dockerfile path is correct
   - Verify build context is set to `backend/`
   - Check logs in Coolify

2. **Connection to MongoDB Fails:**
   - Verify `MONGODB_URI` is correct
   - Check MongoDB is accessible from Coolify server
   - Verify network connectivity

3. **Port Already in Use:**
   - Change port in environment variables
   - Update port mapping in Coolify

### Frontend Issues

1. **Build Fails:**
   - Check Dockerfile path is correct
   - Verify build context is set to `frontend/`
   - Check `NEXT_PUBLIC_API_URL` is set correctly

2. **API Calls Fail:**
   - Verify `NEXT_PUBLIC_API_URL` points to correct backend URL
   - Check CORS settings in backend
   - Verify backend is accessible

3. **Images Not Loading:**
   - Update `next.config.js` with your image domains
   - Rebuild the frontend

## Environment Variables Reference

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://user:pass@host:27017/db` |
| `REDIS_HOST` | Redis host | `redis` or `redis.example.com` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | `your-refresh-secret` |

### Backend Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `REDIS_PASSWORD` | Redis password | (none) |
| `STRIPE_SECRET_KEY` | Stripe secret key | (none) |
| `EMAIL_HOST` | SMTP host | (none) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | (none) |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.example.com/api/v1` |

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS/SSL for all domains
- [ ] Set up proper CORS origins
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular backups of MongoDB
- [ ] Keep dependencies updated

## Monitoring

1. **Health Checks:**
   - Backend: `/health` endpoint
   - Frontend: Root path

2. **Logs:**
   - View logs in Coolify dashboard
   - Set up log aggregation if needed

3. **Metrics:**
   - Monitor resource usage in Coolify
   - Set up alerts for high CPU/memory usage

## Support

For issues specific to Coolify, check:
- [Coolify Documentation](https://coolify.io/docs)
- [Coolify GitHub](https://github.com/coollabsio/coolify)

For application-specific issues, check the main README.md

