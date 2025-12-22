# Fix Health Check and Startup Issues

## The Problem

The container starts but the app isn't running. The health check fails because:
1. **Missing Environment Variables** - MongoDB, Redis, JWT secrets, etc.
2. **App crashes on startup** - Without proper config, the app can't start
3. **Health check can't connect** - Because the app isn't listening on port 5000

## Quick Fix Steps

### 1. Check Container Logs in Coolify

In Coolify dashboard:
- Go to your application
- Click on "Terminal" or "Logs" tab
- Check what errors are showing

Common errors you'll see:
- `MongoServerError: Authentication failed`
- `Error: connect ECONNREFUSED` (MongoDB/Redis)
- `JWT_SECRET is required`

### 2. Add Required Environment Variables

In Coolify → Your App → Configuration → Environment Variables, add:

#### **CRITICAL - Must Have:**
```
NODE_ENV=production
PORT=5000

# MongoDB (REQUIRED)
MONGODB_URI=mongodb://username:password@host:27017/database?authSource=admin

# Redis (REQUIRED)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT (REQUIRED)
JWT_SECRET=your-32-character-secret-key-minimum
REFRESH_TOKEN_SECRET=your-32-character-refresh-secret-minimum
```

#### **Important:**
```
FRONTEND_URL=https://your-frontend-domain.com
APP_URL=https://your-backend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com
```

#### **Optional (but recommended):**
```
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
```

### 3. Fix Health Check Path

In Coolify → Configuration → Healthcheck:
- **Path:** `/health` (not `/api/health`)
- **Port:** `5000`
- **Interval:** `30`
- **Timeout:** `3`
- **Retries:** `3`
- **Start Period:** `60` (increase to 60 seconds to give app time to start)

### 4. Verify MongoDB and Redis

Make sure:
- MongoDB is running and accessible
- Redis is running and accessible
- Connection strings are correct
- Credentials are correct

## Why It Takes So Long

1. **40-second start period** - Coolify waits 40 seconds before checking health
2. **App startup time** - NestJS needs time to:
   - Load configuration
   - Connect to MongoDB
   - Connect to Redis
   - Initialize all modules
3. **Failed health checks** - Each failed check adds delay

## Expected Startup Time

- **Fast:** 10-20 seconds (with all env vars set)
- **Normal:** 20-40 seconds (first startup, connecting to DB)
- **Slow:** 40-60 seconds (if DB connection is slow)

## Debugging Steps

1. **Check Logs:**
   - Coolify → Your App → Logs
   - Look for errors about MongoDB, Redis, or missing env vars

2. **Check Environment Variables:**
   - Coolify → Configuration → Environment Variables
   - Verify all required vars are set

3. **Test Health Endpoint Manually:**
   - Once app starts, test: `https://your-backend-domain.com/health`
   - Should return: `{"status":"ok"}`

4. **Check Container Status:**
   - Coolify → Your App → Overview
   - Should show "Running" status

## Common Issues

### Issue 1: MongoDB Connection Failed
**Error:** `MongoServerError` or `ECONNREFUSED`
**Fix:** 
- Verify `MONGODB_URI` is correct
- Check MongoDB is accessible from Coolify server
- Verify credentials

### Issue 2: Redis Connection Failed
**Error:** `ECONNREFUSED` or `NOAUTH`
**Fix:**
- Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Check Redis is running
- Verify network connectivity

### Issue 3: JWT Secret Missing
**Error:** `JWT_SECRET is required`
**Fix:**
- Add `JWT_SECRET` environment variable
- Use a strong 32+ character string

### Issue 4: App Crashes Immediately
**Error:** Container exits immediately
**Fix:**
- Check logs for the exact error
- Usually missing env vars or DB connection issues

## After Fixing

Once all environment variables are set:
1. **Save** configuration in Coolify
2. **Redeploy** the application
3. **Monitor logs** to see startup progress
4. **Wait 60 seconds** for health check to pass
5. **Test** the health endpoint manually

The app should start successfully! 🎉

