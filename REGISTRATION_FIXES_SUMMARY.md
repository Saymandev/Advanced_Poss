# Registration Fixes Summary

## Issues Fixed

### 1. Password Validation Error During Registration
**Problem**: When registering a new company, the system generated a temporary password using `GeneratorUtil.generateToken()` (UUID-based), which failed password complexity validation because it only contained lowercase hexadecimal characters.

**Error Message**: 
```
Password must contain at least one uppercase letter
```

**Root Cause**: 
- Temporary password was being validated against system security settings
- UUID tokens don't meet password complexity requirements
- Users login with PIN, not password, so temporary password validation is unnecessary

**Solution**:
- Added `skipPasswordValidation` parameter to `UsersService.create()` method
- Skip password validation when `skipPasswordValidation = true`
- Pass `skipPasswordValidation = true` during company owner registration
- Use `PasswordUtil.generate(16)` which generates a more compliant password (though validation is skipped anyway)

**Files Modified**:
- `backend/src/modules/users/users.service.ts`: Added `skipPasswordValidation` parameter
- `backend/src/modules/auth/auth.service.ts`: Pass `skipPasswordValidation = true` during registration

### 2. First Branch Creation Blocked by Multi-Branch Feature
**Problem**: When registering a new company, the first branch creation was being blocked by subscription plan restrictions (multi-branch feature check).

**Error Message**:
```
Multi-branch feature is not available in your current plan. Please upgrade to create additional branches.
```

**Root Cause**: 
- Branch creation service was checking multi-branch feature for ALL branches, including the first one
- First branch should always be allowed regardless of subscription plan

**Solution**:
- Check if this is the first branch (count = 0) before applying restrictions
- Skip multi-branch validation for the first branch
- Only apply subscription plan limits when creating additional branches (2nd, 3rd, etc.)

**Files Modified**:
- `backend/src/modules/branches/branches.service.ts`: Added first branch check

### 3. Address Display Issue (Previously Fixed)
**Problem**: Address was showing as `[object Object], Unknown, Unknown, BD 00000` during company creation.

**Solution** (Already implemented in previous fixes):
- Updated backend to correctly parse address object from frontend
- Added schema transforms to format address strings properly
- Only apply "Unknown" defaults when fields are truly missing, not for empty strings

**Files Modified**:
- `backend/src/modules/auth/auth.service.ts`: Address parsing logic
- `backend/src/modules/companies/schemas/company.schema.ts`: Address formatting transform

## Current Registration Flow

1. **User fills registration form** with company, branch, owner, and subscription package info
2. **Backend creates company** with subscription plan
3. **Backend creates first branch** (always allowed, no restrictions)
4. **Backend creates owner user** with:
   - Temporary password (validation skipped)
   - Hashed PIN (for login)
   - Owner role
5. **Backend generates tokens** and returns to frontend
6. **User logs in with PIN** using PIN login flow

## Testing Checklist

- [ ] Company registration completes successfully
- [ ] First branch is created without errors
- [ ] No password validation errors during registration
- [ ] Address fields are correctly saved and displayed
- [ ] Owner account can login using PIN
- [ ] Company email uniqueness is enforced

## Notes

- Temporary passwords generated during registration are NOT validated because:
  - Users login with PIN, not password
  - Password can be changed later by the user
  - Temporary password is stored but not used for authentication
  
- First branch is always allowed because:
  - Every company needs at least one branch to function
  - This is created during registration
  - Multi-branch restrictions only apply to additional branches

