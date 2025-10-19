# API Connection Test

## Issue Fixed
The "Failed to find company" error was caused by incorrect API URL configuration.

## Problem
- Frontend was calling: `http://localhost:5000/api/auth/find-company`
- Backend expects: `http://localhost:5000/api/v1/auth/find-company`

## Solution
Updated `frontend/src/lib/api/authApi.ts`:
```typescript
// Before
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// After  
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
```

## Test Results
✅ Backend API working: `http://localhost:5000/api/v1/auth/find-company`
✅ CORS configured correctly for `http://localhost:3000`
✅ Frontend API URL updated

## Next Steps
1. Restart frontend server: `npm run dev` in frontend directory
2. Test login with: `pizzapalace@restaurant.com`
3. Should now work without "Failed to find company" error

## Available Test Data
- **Company Email**: `pizzapalace@restaurant.com`
- **PINs**: 
  - Owner: `111111`
  - Manager: `222222` 
  - Chef: `333333`
  - Waiter: `444444`
  - Cashier: `555555`
