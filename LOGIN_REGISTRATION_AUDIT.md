# Login & Registration System Audit

## Executive Summary

This document provides a comprehensive audit of the authentication system, identifying security gaps and areas for improvement, particularly around PIN login and system security settings enforcement.

---

## 1. Current Authentication Methods

### 1.1 Regular Email/Password Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Flow**: Email + Password → JWT Tokens
- **Status**: ✅ **Fully Implemented**
- **Security Features**:
  - ✅ Account lockout checking (hardcoded 5 attempts, 15 minutes)
  - ✅ Login attempt tracking
  - ✅ Account status validation (isActive)
  - ✅ Password hashing verification

### 1.2 PIN Login (Basic)
- **Endpoint**: `POST /api/v1/auth/login/pin`
- **Flow**: Branch ID + PIN → JWT Tokens
- **Status**: ⚠️ **SECURITY GAPS IDENTIFIED**
- **Issues**:
  - ❌ **NO login attempt tracking**
  - ❌ **NO account lockout checking**
  - ❌ **NO security settings enforcement**

### 1.3 PIN Login with Role (Enhanced)
- **Endpoint**: `POST /api/v1/auth/login/pin-with-role`
- **Flow**: Company ID + Branch ID + Role + PIN → JWT Tokens
- **Status**: ⚠️ **PARTIAL SECURITY IMPLEMENTATION**
- **Security Features**:
  - ✅ Account lockout checking (checks `lockUntil`)
  - ✅ Account status validation (isActive)
  - ✅ Login activity logging (failed attempts logged)
  - ❌ **NO login attempt incrementing** (logs but doesn't lock)
  - ❌ **NO security settings enforcement**

### 1.4 Super Admin Login
- **Endpoint**: `POST /api/v1/auth/login/super-admin`
- **Flow**: Email + Password → JWT Tokens
- **Status**: ✅ **Fully Implemented**
- **Security Features**: Same as regular login

### 1.5 Company Owner Registration
- **Endpoint**: `POST /api/v1/auth/register`
- **Flow**: Company Info + Branch Info + Owner Info + Subscription → Company + Branch + Owner
- **Status**: ⚠️ **PARTIAL VALIDATION**
- **Issues**:
  - ❌ **Hardcoded password validation** (not using system settings)
  - ❌ **PIN validation exists but not enforced**

---

## 2. Security Settings Configuration

### 2.1 System Settings Schema
**Location**: `backend/src/modules/settings/schemas/system-settings.schema.ts`

```typescript
security: {
  minLength: number;              // Default: 8
  requireUppercase: boolean;      // Default: true
  requireLowercase: boolean;      // Default: true
  requireNumbers: boolean;        // Default: true
  requireSpecialChars: boolean;   // Default: false
  maxAttempts: number;            // Default: 5
  lockoutDuration: number;        // Default: 30 (minutes)
}
```

### 2.2 Current Implementation Status
- ✅ **Settings stored in database**
- ✅ **Settings can be updated via UI**
- ❌ **Settings NOT enforced in authentication flows**
- ❌ **Hardcoded values used instead**

---

## 3. Critical Security Gaps

### 3.1 PIN Login Security Issues

#### Issue 1: No Login Attempt Tracking
**Location**: `backend/src/modules/auth/auth.service.ts:179-214`

```typescript
async loginWithPin(pinLoginDto: PinLoginDto) {
  // ... finds user ...
  if (isPinValid) {
    // Success - generates tokens
  }
  // ❌ FAILURE - No attempt tracking, no lockout check
  throw new UnauthorizedException('Invalid PIN');
}
```

**Impact**: 
- Unlimited PIN attempts possible
- No account lockout protection
- Vulnerable to brute force attacks

#### Issue 2: PIN Login with Role - Logs but Doesn't Lock
**Location**: `backend/src/modules/auth/auth.service.ts:1075-1094`

```typescript
if (!isPinValid) {
  // ✅ Logs failed attempt
  await this.logLoginActivity({ status: LoginStatus.FAILED });
  // ❌ BUT doesn't increment loginAttempts
  // ❌ BUT doesn't lock account
  throw new UnauthorizedException('Invalid PIN for this role');
}
```

**Impact**:
- Failed attempts are logged but don't trigger lockout
- Account can be brute-forced indefinitely

#### Issue 3: Hardcoded Security Values
**Location**: `backend/src/modules/users/users.service.ts:478-480`

```typescript
// ❌ Hardcoded values - not using system settings
if (attempts >= 5) {
  updates.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
}
```

**Impact**:
- System settings (maxAttempts, lockoutDuration) are ignored
- Cannot customize security policies
- Inconsistent behavior

### 3.2 Password Validation Issues

#### Issue 4: Hardcoded Password Rules
**Location**: `backend/src/modules/auth/dto/register.dto.ts:20-24`

```typescript
@MinLength(8)  // ❌ Hardcoded - should use system settings
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
  message: 'Password must contain uppercase, lowercase, number and special character',
})  // ❌ Always requires special chars - should check system settings
```

**Impact**:
- Password policy cannot be customized
- System settings are ignored
- Inconsistent validation between registration and password changes

---

## 4. Missing Security Features

### 4.1 PIN Login Missing Features
- ❌ Login attempt tracking
- ❌ Account lockout enforcement
- ❌ Security settings integration
- ❌ Failed attempt notifications (optional)

### 4.2 System Settings Not Used
- ❌ Password validation doesn't use `security.minLength`
- ❌ Password validation doesn't use `security.requireUppercase`
- ❌ Password validation doesn't use `security.requireLowercase`
- ❌ Password validation doesn't use `security.requireNumbers`
- ❌ Password validation doesn't use `security.requireSpecialChars`
- ❌ Login attempts don't use `security.maxAttempts`
- ❌ Lockout duration doesn't use `security.lockoutDuration`
- ❌ Session timeout doesn't use `sessionTimeout`

---

## 5. Recommended Fixes

### Priority 1: Critical Security (Must Fix)

1. **Fix PIN Login Security**
   - Add login attempt tracking for PIN login methods
   - Enforce account lockout for PIN login failures
   - Check account lockout status before PIN validation

2. **Integrate System Security Settings**
   - Create utility to fetch system settings
   - Use `maxAttempts` instead of hardcoded 5
   - Use `lockoutDuration` instead of hardcoded 15 minutes
   - Create password validation utility using system settings

3. **Password Validation Utility**
   - Create `PasswordValidator` class that uses system settings
   - Replace hardcoded DTO validators with dynamic validation
   - Apply to: Registration, Password Change, Admin Password Update

### Priority 2: Important Improvements

4. **Session Timeout Enforcement**
   - Implement JWT token expiration based on `sessionTimeout`
   - Add middleware to check session validity
   - Clear expired sessions

5. **Enhanced Login Activity Tracking**
   - Track PIN login attempts properly
   - Add security event logging
   - Monitor for suspicious patterns

---

## 6. Implementation Plan

### Phase 1: Security Settings Integration
1. Create `SecuritySettingsService` to fetch system settings
2. Create `PasswordValidator` utility using system settings
3. Create `LoginSecurityService` for attempt tracking using system settings

### Phase 2: Fix PIN Login Security
1. Add attempt tracking to `loginWithPin`
2. Add attempt tracking to `loginWithRole` (PIN)
3. Add lockout checking to both methods
4. Integrate with system settings

### Phase 3: Password Validation Updates
1. Update registration DTO validation (custom validator)
2. Update password change endpoint
3. Update admin password update endpoint
4. Test all password creation flows

### Phase 4: Testing & Documentation
1. Unit tests for security utilities
2. Integration tests for login flows
3. Security testing (brute force, lockout)
4. Update API documentation

---

## 7. Code Locations Reference

### Authentication Service
- `backend/src/modules/auth/auth.service.ts`
  - `login()` - Line 72-100
  - `loginWithPin()` - Line 179-214 ❌
  - `pinLoginWithRole()` - Line 216-276 ❌
  - `loginWithRole()` - Line 933-1163 ⚠️

### User Service
- `backend/src/modules/users/users.service.ts`
  - `incrementLoginAttempts()` - Line 471-484 ❌ (hardcoded)

### DTOs
- `backend/src/modules/auth/dto/register.dto.ts` ❌ (hardcoded)
- `backend/src/modules/users/dto/create-user.dto.ts` ❌ (hardcoded)

### System Settings
- `backend/src/modules/settings/schemas/system-settings.schema.ts` ✅
- `backend/src/modules/settings/settings.service.ts` ✅

---

## 8. Security Best Practices Checklist

- [ ] All login methods track failed attempts
- [ ] All login methods enforce account lockout
- [ ] Security settings are dynamically enforced
- [ ] Password validation uses system settings
- [ ] Session timeout is configurable and enforced
- [ ] Login attempts are logged for audit
- [ ] Account lockout messages are user-friendly
- [ ] Security settings changes take effect immediately
- [ ] PIN and password logins have same security level
- [ ] Super admin can bypass lockout (if desired)

---

## Conclusion

The current authentication system has **critical security gaps**, particularly in PIN login flows. System security settings exist but are **not enforced**, creating inconsistency and potential vulnerabilities. 

**Recommended Action**: Implement all Priority 1 fixes before production deployment.

