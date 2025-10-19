# PIN Login Fix - API Compatibility Issue

## 🐛 **Problem Fixed**

**Error**: `"property userId should not exist"`
**Root Cause**: Frontend was sending `userId` field, but backend API doesn't expect it.

## 🔍 **API Analysis**

The backend `/api/v1/auth/login-with-role` endpoint expects:
```typescript
{
  companyId: string;
  branchId: string; 
  role: string;
  pin: string;
}
```

**NOT** `userId` - the backend automatically handles multiple users with the same role by trying all users until it finds one with the matching PIN.

## 🔧 **Solution Applied**

### 1. **Removed userId from API Request**
```typescript
// Before: Sending userId (caused error)
const result = await pinLoginWithRole({ ...data, pin }).unwrap();

// After: Remove userId before sending
const { userId, ...loginData } = data;
const result = await pinLoginWithRole({ ...loginData, pin }).unwrap();
```

### 2. **Simplified User Selection Logic**
- ✅ **Removed complex user selection UI** - Not needed since backend handles it
- ✅ **Simplified role selection** - Back to simple grid layout
- ✅ **Removed user validation** - Backend automatically finds the right user

### 3. **How Backend Handles Multiple Users**
The backend automatically:
1. Finds all users with the selected role in the branch
2. Tries each user's PIN until one matches
3. Returns the user data for the matching PIN

## 🎯 **User Experience**

**Simple Flow:**
1. Select branch
2. Select role (e.g., "waiter")
3. Enter PIN (e.g., "3456")
4. ✅ Backend automatically finds the right user account

## 🔑 **All PINs Available**

- **Owner**: `1234`
- **Manager**: `5678`
- **Chef**: `9012`
- **Waiter 1**: `3456`
- **Waiter 2**: `7890`
- **Cashier**: `2468`

## 🧪 **Test the Fix**

1. Go to login page
2. Enter: `pizzapalace@restaurant.com`
3. Select branch
4. Select "waiter" role
5. Enter PIN: `3456` or `7890`
6. ✅ Should login successfully!

The PIN login should now work perfectly! 🚀
