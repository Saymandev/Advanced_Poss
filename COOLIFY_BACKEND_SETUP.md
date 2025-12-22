# Coolify Backend Setup - Step by Step

## Current Form Configuration

Based on your screenshot, here's what to change:

### ✅ Correct Settings:

1. **Repository URL**: `https://github.com/Saymandev/Advanced_Poss` ✅ (Correct)
2. **Branch**: `main` ✅ (Correct)
3. **Port**: `5000` ✅ (Correct)
4. **Is it a static site?**: Unchecked ✅ (Correct)

### ⚠️ Changes Needed:

1. **Build Pack**: Change from `Nixpacks` to `Dockerfile`
   - Click the dropdown
   - Select "Dockerfile"

2. **Base Directory**: Change from `/` to `backend/`
   - This tells Coolify where your backend code is in the monorepo

## After Clicking "Continue"

You'll see additional configuration options. Set these:

### Dockerfile Settings:
- **Dockerfile Path**: `backend/Dockerfile`
- **Build Context**: `backend/` (if available)

### Environment Variables:
Add these environment variables (you'll add them in the next step):

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://user:password@host:27017/database?authSource=admin
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-32-character-secret-key-here
REFRESH_TOKEN_SECRET=your-32-character-refresh-secret
FRONTEND_URL=https://your-frontend-domain.com
APP_URL=https://your-backend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com
```

### Health Check:
- **Path**: `/health`
- **Port**: `5000`

## Next Steps After Backend Setup:

1. ✅ Configure backend (current step)
2. ⏭️ Set up MongoDB database
3. ⏭️ Set up Redis
4. ⏭️ Deploy frontend
5. ⏭️ Configure domains
6. ⏭️ Seed database

