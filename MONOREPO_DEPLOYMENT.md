# Monorepo Deployment Guide for Coolify

## ✅ Having Backend and Frontend in the Same Repository is Perfect!

This guide explains how to deploy a monorepo (backend + frontend in same repo) to Coolify.

## Repository Structure

Your repository should look like this:

```
your-repository/
├── backend/
│   ├── Dockerfile          ← Backend Dockerfile
│   ├── package.json
│   ├── .dockerignore
│   └── src/
├── frontend/
│   ├── Dockerfile          ← Frontend Dockerfile
│   ├── package.json
│   ├── .dockerignore
│   └── src/
├── docker-compose.yml      (optional)
└── README.md
```

## How It Works

When you set the **Build Context** in Coolify:
- `backend/` - Docker only sees files in the backend folder
- `frontend/` - Docker only sees files in the frontend folder

This means:
- ✅ Each service builds independently
- ✅ No conflicts between backend and frontend
- ✅ Smaller Docker build contexts (faster builds)
- ✅ Clean separation of concerns

## Deployment Steps

### Backend Deployment

1. **In Coolify:**
   - New Resource → Application → Dockerfile

2. **Settings:**
   ```
   Repository: https://github.com/yourusername/your-repo
   Branch: main
   Dockerfile Path: backend/Dockerfile
   Build Context: backend/          ← This is the key!
   Port: 5000
   ```

3. **What happens:**
   - Coolify clones your repo
   - Sets build context to `backend/`
   - Docker only sees `backend/` folder
   - Builds using `backend/Dockerfile`
   - Ignores `frontend/` completely

### Frontend Deployment

1. **In Coolify:**
   - New Resource → Application → Dockerfile

2. **Settings:**
   ```
   Repository: https://github.com/yourusername/your-repo
   Branch: main                    ← Same repo!
   Dockerfile Path: frontend/Dockerfile
   Build Context: frontend/        ← This is the key!
   Port: 3000
   ```

3. **What happens:**
   - Coolify clones your repo (same repo as backend)
   - Sets build context to `frontend/`
   - Docker only sees `frontend/` folder
   - Builds using `frontend/Dockerfile`
   - Ignores `backend/` completely

## Benefits of Monorepo

1. **Single Source of Truth**
   - All code in one place
   - Easier to manage versions
   - Shared documentation

2. **Atomic Commits**
   - Update backend and frontend together
   - Easier to keep APIs in sync
   - Single deployment trigger

3. **Simplified CI/CD**
   - One repository to manage
   - Shared workflows possible
   - Easier dependency management

4. **Coolify Handles It Well**
   - Build contexts isolate builds
   - No conflicts between services
   - Independent deployments

## Common Questions

### Q: Will building backend affect frontend?
**A:** No! The build context isolates each build. Backend build only sees `backend/`, frontend build only sees `frontend/`.

### Q: Can I deploy them separately?
**A:** Yes! You can deploy backend and frontend independently. They're separate resources in Coolify.

### Q: What if I update both at the same time?
**A:** Coolify will build both, but they're independent. One can succeed while the other fails (if there's an issue).

### Q: Do I need separate branches?
**A:** No! You can use the same branch (main/master) for both. The build context handles the separation.

### Q: What about shared code?
**A:** If you have shared code, you can:
- Use npm packages
- Create a shared folder and copy it in both Dockerfiles
- Use Git submodules (not recommended for this use case)

## Troubleshooting

### Build Context Issues

**Problem:** Build fails with "file not found"
**Solution:** 
- Verify Build Context is exactly `backend/` or `frontend/` (with trailing slash)
- Check Dockerfile path is correct
- Ensure Dockerfile exists in that folder

**Problem:** Build includes wrong files
**Solution:**
- Check `.dockerignore` files are in place
- Verify Build Context is set correctly
- Review Dockerfile COPY commands

### Repository Access

**Problem:** Coolify can't access repository
**Solution:**
- Check repository is public or Coolify has access
- Verify Git credentials in Coolify
- Check branch name is correct

## Best Practices

1. **Keep Build Contexts Separate**
   - Always use `backend/` and `frontend/`
   - Never use root `/` as build context

2. **Use .dockerignore**
   - Reduces build time
   - Prevents copying unnecessary files
   - Smaller Docker images

3. **Independent Versioning**
   - Each service can have its own version
   - Update package.json versions independently
   - Tag releases separately if needed

4. **Environment Variables**
   - Keep backend and frontend env vars separate
   - Use different prefixes if needed
   - Document all required variables

## Example Coolify Configuration

### Backend Resource
```
Name: restaurant-pos-backend
Type: Application
Build Pack: Dockerfile
Repository: https://github.com/user/repo
Branch: main
Dockerfile: backend/Dockerfile
Build Context: backend/
Port: 5000
```

### Frontend Resource
```
Name: restaurant-pos-frontend
Type: Application
Build Pack: Dockerfile
Repository: https://github.com/user/repo  ← Same repo!
Branch: main
Dockerfile: frontend/Dockerfile
Build Context: frontend/
Port: 3000
```

## Summary

✅ **Monorepo is perfectly fine for Coolify**
✅ **Build Context isolates each service**
✅ **No conflicts or issues**
✅ **Simpler to manage than separate repos**

Just remember:
- Set Build Context to `backend/` for backend
- Set Build Context to `frontend/` for frontend
- Use correct Dockerfile paths
- That's it! 🎉

