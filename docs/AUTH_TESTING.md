# 🔐 Authentication Module - Testing Guide

## Setup

1. **Start the backend server:**
   ```bash
   cd backend
   pnpm install
   pnpm dev
   ```

2. **Open Swagger UI:**
   - Navigate to http://localhost:5000/api/docs
   - You'll see all auth endpoints under the "Authentication" tag

## Testing Scenarios

### 1️⃣ User Registration

**Endpoint:** `POST /auth/register`

**Request:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "pin": "123456",
  "firstName": "John",
  "lastName": "Doe",
  "role": "waiter"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "waiter"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    },
    "verificationToken": "abc123..."
  }
}
```

**Notes:**
- Password must contain uppercase, lowercase, number, and special character
- PIN must be exactly 6 digits
- Email must be unique
- Verification token is included for development (should be sent via email in production)

---

### 2️⃣ Email/Password Login

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "waiter",
      "companyId": "...",
      "branchId": "..."
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**Error Scenarios:**
- Wrong password: `401 Unauthorized - Invalid email or password`
- Wrong email: `401 Unauthorized - Invalid email or password`
- Account locked: `401 Unauthorized - Account is locked. Try again in X minutes`
- Account deactivated: `401 Unauthorized - Account is deactivated`

---

### 3️⃣ PIN Login (POS)

**Endpoint:** `POST /auth/login/pin`

**Request:**
```json
{
  "pin": "123456",
  "branchId": "507f1f77bcf86cd799439011"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "waiter",
      "companyId": "...",
      "branchId": "..."
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

**Notes:**
- Searches for users in the specified branch with matching PIN
- Useful for POS terminals where staff log in with PIN instead of email/password

---

### 4️⃣ Refresh Token

**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Error Scenarios:**
- Invalid token: `401 Unauthorized - Invalid refresh token`
- Expired token: `401 Unauthorized - Invalid refresh token`

---

### 5️⃣ Email Verification

**Endpoint:** `GET /auth/verify-email/:token`

**Example:** `GET /auth/verify-email/abc123xyz`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully"
  }
}
```

**Error Scenarios:**
- Invalid token: `400 Bad Request - Invalid verification token`

---

### 6️⃣ Forgot Password

**Endpoint:** `POST /auth/forgot-password`

**Request:**
```json
{
  "email": "john.doe@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "If the email exists, a reset link has been sent",
    "resetToken": "xyz789..."
  }
}
```

**Notes:**
- Always returns success message to prevent email enumeration
- In development, resetToken is returned (should be sent via email in production)
- Token expires in 1 hour

---

### 7️⃣ Reset Password

**Endpoint:** `POST /auth/reset-password`

**Request:**
```json
{
  "token": "xyz789...",
  "newPassword": "NewSecurePass123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

**Error Scenarios:**
- Invalid/expired token: `400 Bad Request - Invalid or expired reset token`
- Weak password: `400 Bad Request - Password validation failed`

---

### 8️⃣ Change Password (Authenticated)

**Endpoint:** `POST /auth/change-password`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Error Scenarios:**
- Wrong current password: `401 Unauthorized - Current password is incorrect`
- Not authenticated: `401 Unauthorized - Invalid or expired token`

---

### 9️⃣ Logout

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## 🔒 Security Features Tested

### Account Lockout
1. Try logging in with wrong password 5 times
2. 6th attempt should return: `Account is locked. Try again in 15 minutes`
3. Account unlocks automatically after 15 minutes

### Token Expiration
- **Access Token:** Expires in 15 minutes (configurable in .env)
- **Refresh Token:** Expires in 7 days (configurable in .env)
- Use refresh endpoint to get new access token

### Password Validation
Password must contain:
- ✅ At least 8 characters
- ✅ One uppercase letter
- ✅ One lowercase letter
- ✅ One number
- ✅ One special character (@$!%*?&)

### PIN Validation
- ✅ Exactly 6 digits
- ✅ Numeric only
- ✅ No letters or special characters

---

## 🧪 Testing with Postman

1. **Import Collection:**
   - Create a new Postman collection
   - Add all endpoints from above

2. **Environment Variables:**
   ```
   base_url: http://localhost:5000/api/v1
   accessToken: (set after login)
   refreshToken: (set after login)
   ```

3. **Automated Tests Script:**
   ```javascript
   // Save tokens after login
   pm.test("Save tokens", function () {
       var jsonData = pm.response.json();
       pm.environment.set("accessToken", jsonData.data.tokens.accessToken);
       pm.environment.set("refreshToken", jsonData.data.tokens.refreshToken);
   });
   ```

---

## 🐛 Common Issues & Solutions

### Issue: "Invalid or expired token"
**Solution:** Token might have expired. Use refresh endpoint or login again.

### Issue: "User not found or inactive"
**Solution:** User might be deactivated. Check database or contact admin.

### Issue: "Account is locked"
**Solution:** Wait 15 minutes or manually reset `lockUntil` field in database.

### Issue: Module not found errors
**Solution:** 
```bash
cd backend
rm -rf node_modules
pnpm install
```

---

## 📊 Testing Checklist

- [ ] Register new user successfully
- [ ] Login with email/password
- [ ] Login with PIN
- [ ] Refresh access token
- [ ] Verify email
- [ ] Request password reset
- [ ] Reset password with token
- [ ] Change password (authenticated)
- [ ] Logout successfully
- [ ] Test account lockout (5 failed attempts)
- [ ] Test token expiration
- [ ] Test with invalid tokens
- [ ] Test password validation rules
- [ ] Test PIN validation

---

## 🚀 Next Steps

After authentication is working:
1. Create Companies module for multi-step registration
2. Create Branches module
3. Implement complete onboarding flow
4. Add email service for verification/reset emails
5. Add 2FA (Two-Factor Authentication)

---

**Authentication Module Status:** ✅ Complete and Ready for Testing!

