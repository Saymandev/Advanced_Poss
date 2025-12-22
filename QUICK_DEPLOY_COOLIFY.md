# Quick Deploy to Coolify

## Important: Monorepo Setup ✅

**Having both backend and frontend in the same GitHub repository is perfectly fine!** This is called a "monorepo" and Coolify handles it well.

Your repository structure should look like:
```
your-repo/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── README.md
```

The key is setting the correct **Build Context** in Coolify:
- Backend: `backend/`
- Frontend: `frontend/`

## Step-by-Step Guide

### 1. Prepare Your Repository

Make sure your code is pushed to Git (GitHub, GitLab, etc.)

### 2. Deploy Backend

1. **In Coolify Dashboard:**
   - Click "New Resource" → "Application"
   - Choose "Dockerfile"

2. **Configuration:**
   ```
   Name: restaurant-pos-backend
   Repository: https://github.com/yourusername/your-repo
   Branch: main (or master)
   Dockerfile Path: backend/Dockerfile
   Build Context: backend/  ⚠️ IMPORTANT: Must be "backend/"
   Port: 5000
   ```
   
   **Note:** The Build Context tells Docker to only use files from the `backend/` folder, ignoring the rest of the repo.

3. **Environment Variables** (Add in Coolify):
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb://user:pass@host:27017/db?authSource=admin
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   JWT_SECRET=your-32-char-secret-key-here
   REFRESH_TOKEN_SECRET=your-32-char-refresh-secret
   FRONTEND_URL=https://your-frontend-domain.com
   APP_URL=https://your-backend-domain.com
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

4. **Health Check:**
   - Path: `/health`
   - Port: `5000`

5. **Deploy!**

### 3. Deploy Frontend

1. **In Coolify Dashboard:**
   - Click "New Resource" → "Application"
   - Choose "Dockerfile"

2. **Configuration:**
   ```
   Name: restaurant-pos-frontend
   Repository: https://github.com/yourusername/your-repo
   Branch: main (or master) - SAME REPO as backend!
   Dockerfile Path: frontend/Dockerfile
   Build Context: frontend/  ⚠️ IMPORTANT: Must be "frontend/"
   Port: 3000
   ```
   
   **Note:** Even though it's the same repository, the Build Context isolates the build to only the `frontend/` folder.

3. **Environment Variables:**
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
   NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.com
   ```

4. **Build Arguments:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
   ```

5. **Deploy!**

### 4. Set Up Databases

#### MongoDB (on Coolify):
1. New Resource → Database → MongoDB
2. Copy connection string
3. Update `MONGODB_URI` in backend env vars

#### Redis (on Coolify):
1. New Resource → Database → Redis
2. Copy host, port, password
3. Update Redis env vars in backend

### 5. Configure Domains

1. **Backend Domain:**
   - Add domain in Coolify
   - Point DNS to Coolify IP
   - SSL auto-enabled

2. **Frontend Domain:**
   - Add domain in Coolify
   - Point DNS to Coolify IP
   - SSL auto-enabled

### 6. Post-Deployment

1. **Seed Database:**
   - Use Coolify terminal or SSH
   ```bash
   cd /app
   npm run seed
   npm run create-super-admin
   ```

2. **Test:**
   - Backend: `https://your-backend-domain.com/health`
   - Frontend: `https://your-frontend-domain.com`

## Important Notes

- ✅ Use strong secrets (32+ characters for JWT)
- ✅ Update all default passwords
- ✅ Enable SSL/HTTPS
- ✅ Set up proper CORS origins
- ✅ Configure Stripe webhooks after deployment

## Troubleshooting

**Backend won't start?**
- Check MongoDB connection string
- Verify all required env vars are set
- Check logs in Coolify

**Frontend build fails?**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check Dockerfile path is `frontend/Dockerfile`
- Check build context is `frontend/`

**API calls fail?**
- Verify `NEXT_PUBLIC_API_URL` matches backend URL
- Check CORS settings in backend
- Verify backend is accessible

For detailed information, see `COOLIFY_DEPLOYMENT.md`

