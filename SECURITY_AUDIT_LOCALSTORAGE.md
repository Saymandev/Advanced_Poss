# Security Audit: localStorage Usage

## Executive Summary

This audit identifies sensitive data stored in localStorage that could be exploited by attackers through XSS (Cross-Site Scripting) attacks.

## Critical Security Issues

### 🔴 CRITICAL: Authentication Tokens

**Location:** `frontend/src/lib/slices/authSlice.ts`

**Data Stored:**
- `accessToken` - JWT access token
- `refreshToken` - JWT refresh token

**Risk Level:** **CRITICAL** ⚠️

**Impact:**
- If stolen via XSS, attacker can impersonate the user
- Attacker can access all user data and perform actions on their behalf
- Refresh token allows attacker to get new access tokens even after expiration

**Recommendation:**
1. **IMMEDIATE:** Move tokens to httpOnly cookies (most secure)
2. **ALTERNATIVE:** Use sessionStorage instead of localStorage (cleared on tab close)
3. **FALLBACK:** Encrypt tokens before storing in localStorage

---

### 🔴 HIGH: User Object

**Location:** `frontend/src/lib/slices/authSlice.ts`

**Data Stored:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "owner",
  "companyId": "company_id",
  "branchId": "branch_id",
  "phoneNumber": "+1234567890"
}
```

**Risk Level:** **HIGH** ⚠️

**Impact:**
- Personal Identifiable Information (PII) exposure
- Role and company information can be used for privilege escalation attempts
- Phone numbers can be used for social engineering

**Recommendation:**
- Store minimal user data (only ID and role)
- Remove sensitive fields (email, phone) or encrypt them
- Consider using httpOnly cookies for user session

---

### 🟡 MEDIUM: Company Context

**Location:** `frontend/src/lib/slices/authSlice.ts`, `frontend/src/app/auth/login/page.tsx`

**Data Stored:**
```json
{
  "companyId": "company_id",
  "companyName": "Restaurant Name",
  "companySlug": "restaurant-slug",
  "logoUrl": "https://...",
  "branches": [
    {
      "id": "branch_id",
      "name": "Branch Name",
      "address": "...",
      ...
    }
  ]
}
```

**Risk Level:** **MEDIUM** ⚠️

**Impact:**
- Company structure information exposure
- Branch details can be used for reconnaissance
- Could aid in targeted attacks

**Recommendation:**
- Only store companyId and slug (minimal data)
- Don't store full branch details
- Clear on logout

---

### 🟡 MEDIUM: Customer Information (POS)

**Location:** `frontend/src/app/dashboard/pos/page.tsx`

**Data Stored:**
- `pos_customerInfo`: `{ name, phone, email }`
- `pos_customerId`: Customer ID
- `pos_deliveryDetails`: `{ contactName, contactPhone, addressLine1, city, ... }`

**Risk Level:** **MEDIUM** ⚠️

**Impact:**
- PII exposure (names, phone numbers, email addresses, physical addresses)
- GDPR/Privacy compliance issues
- Can be used for identity theft or phishing

**Recommendation:**
1. **IMMEDIATE:** Clear customer data after order completion
2. **ENCRYPT:** Encrypt PII before storing
3. **SESSION ONLY:** Use sessionStorage instead of localStorage
4. **AUTO-CLEAR:** Implement automatic cleanup after 24 hours

---

## Non-Sensitive Data (OK to Store)

✅ **Safe to store in localStorage:**
- `pos_cart` - Shopping cart items (no PII)
- `pos_selectedTable` - Table selection
- `pos_orderType` - Order type (dine-in, takeaway, delivery)
- `pos_deliveryFee` - Delivery fee amount
- `pos_guestCount` - Guest count
- `pos_paymentMode` - Payment mode selection
- `cart_{companySlug}_{branchSlug}` - Public shopping cart
- `feedbackSubmitted` - Timestamp only
- `restaurant-notifications` - Notification preferences

---

## Attack Scenarios

### Scenario 1: XSS Attack
1. Attacker injects malicious script via form input
2. Script executes and reads `localStorage.getItem('accessToken')`
3. Attacker sends token to their server
4. Attacker uses token to impersonate user

### Scenario 2: Malicious Browser Extension
1. User installs malicious extension
2. Extension has access to localStorage
3. Extension steals tokens and user data
4. Attacker gains unauthorized access

### Scenario 3: Physical Access
1. Attacker gains physical access to device
2. Opens browser DevTools
3. Reads all localStorage data
4. Copies tokens and uses them

---

## Recommended Solutions

### Priority 1: Move Tokens to httpOnly Cookies (BEST)

**Benefits:**
- Not accessible via JavaScript (XSS protection)
- Automatically sent with requests
- Can set secure and SameSite flags

**Implementation:**
```typescript
// Backend: Set httpOnly cookies
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000 // 15 minutes
});
```

### Priority 2: Encrypt Sensitive Data

**Implementation:**
```typescript
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

function encryptData(data: string): string {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
}

function decryptData(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

### Priority 3: Use sessionStorage for Temporary Data

**For customer info and delivery details:**
```typescript
// Use sessionStorage instead of localStorage
sessionStorage.setItem('pos_customerInfo', JSON.stringify(customerInfo));
// Automatically cleared when tab closes
```

### Priority 4: Implement Content Security Policy (CSP)

**Add to `next.config.js`:**
```javascript
headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
      }
    ]
  }
]
```

### Priority 5: Auto-Clear Sensitive Data

**Implement automatic cleanup:**
```typescript
// Clear customer data after 24 hours
const CUSTOMER_DATA_TTL = 24 * 60 * 60 * 1000; // 24 hours

function shouldClearCustomerData(timestamp: string): boolean {
  const stored = new Date(timestamp).getTime();
  const now = Date.now();
  return (now - stored) > CUSTOMER_DATA_TTL;
}
```

---

## Immediate Actions Required

1. ✅ **AUDIT COMPLETE** - This document
2. ⚠️ **URGENT:** Move tokens to httpOnly cookies
3. ⚠️ **URGENT:** Encrypt customer PII before storing
4. ⚠️ **HIGH:** Clear customer data after order completion
5. ⚠️ **MEDIUM:** Implement CSP headers
6. ⚠️ **MEDIUM:** Add data expiration for sensitive localStorage items

---

## Compliance Considerations

### GDPR (EU)
- Customer PII in localStorage may violate GDPR if not properly secured
- Must have consent and encryption for PII storage

### CCPA (California)
- Similar requirements for PII protection
- Must allow users to delete their data

### PCI DSS (Payment Cards)
- If storing payment-related data, must comply with PCI DSS
- Currently not storing card data (GOOD ✅)

---

## Testing Checklist

- [ ] Verify tokens are not accessible via JavaScript after moving to cookies
- [ ] Test XSS protection with CSP headers
- [ ] Verify customer data is cleared after order completion
- [ ] Test encryption/decryption of sensitive data
- [ ] Verify sessionStorage clears on tab close
- [ ] Test logout clears all sensitive data
- [ ] Verify no sensitive data in browser DevTools

---

## References

- [OWASP: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP: Secure Cookie Flags](https://owasp.org/www-community/HttpOnly)
- [MDN: localStorage Security](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#security)
- [GDPR: Data Protection](https://gdpr.eu/)

---

**Last Updated:** 2025-12-07
**Audited By:** Security Audit System
**Status:** ⚠️ CRITICAL ISSUES IDENTIFIED - IMMEDIATE ACTION REQUIRED

