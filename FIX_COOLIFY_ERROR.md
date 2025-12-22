# Fix Coolify Deployment Error

## The Problem

The error shows:
```
cat: can't open '/artifacts/.../Dockerfile': No such file or directory
```

**Why?** Coolify is looking for the Dockerfile in the root directory, but your Dockerfile is in the `backend/` folder (monorepo structure).

## The Solution

In the Configuration page, update these two fields:

### 1. Base Directory
**Current:** `/`  
**Change to:** `backend/`

This tells Coolify to look in the `backend/` folder for your code.

### 2. Dockerfile Location
**Current:** `/Dockerfile`  
**Change to:** `Dockerfile` (or `backend/Dockerfile` if Base Directory doesn't work)

Since Base Directory is now `backend/`, the Dockerfile path should be relative to that folder.

## Step-by-Step Fix

1. **Go to Configuration tab** (you're already there)

2. **Find "Build" section**

3. **Update Base Directory:**
   - Find "Base Directory" field
   - Change from `/` to `backend/`
   - This tells Coolify: "Start from the backend folder"

4. **Update Dockerfile Location:**
   - Find "Dockerfile Location" field
   - Change from `/Dockerfile` to `Dockerfile`
   - Since Base Directory is `backend/`, Dockerfile is just `Dockerfile` (relative path)

5. **Click "Save"** button (top right)

6. **Deploy again** - Click the "Deploy" button

## Visual Guide

**Before (Wrong):**
```
Base Directory: /
Dockerfile Location: /Dockerfile
```
Coolify looks: `/Dockerfile` → ❌ Not found!

**After (Correct):**
```
Base Directory: backend/
Dockerfile Location: Dockerfile
```
Coolify looks: `backend/Dockerfile` → ✅ Found!

## Alternative (If Above Doesn't Work)

If setting Base Directory to `backend/` doesn't work, try:

```
Base Directory: /
Dockerfile Location: backend/Dockerfile
```

This tells Coolify: "Start from root, but Dockerfile is in backend/ folder"

## After Fixing

Once you save and deploy:
- ✅ Coolify will find `backend/Dockerfile`
- ✅ Build context will be `backend/`
- ✅ Build should succeed

## Still Having Issues?

If it still fails, check:
1. Is `backend/Dockerfile` in your GitHub repo?
2. Is the branch correct? (should be `main`)
3. Check the deployment logs for new errors

