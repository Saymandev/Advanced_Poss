# Security Configuration & Best Practices

## Overview

The system implements multiple layers of security to protect against common vulnerabilities and attacks. This document outlines all security measures implemented.

## Security Features

### 1. Authentication & Authorization

#### JWT-Based Authentication
- Access tokens (15 minutes expiry)
- Refresh tokens (7 days expiry)
- Secure token storage and rotation
- Automatic token invalidation on logout

#### Role-Based Access Control (RBAC)
- 5 user roles: Super Admin, Owner, Manager, Chef, Waiter
- Granular permissions per module
- Route-level authorization guards
- Resource-level access control

#### Two-Factor Authentication (2FA)
- TOTP-based authentication
- QR code generation for easy setup
- Backup codes for recovery
- Optional per user
- Time-based one-time passwords

**2FA Endpoints:**
```typescript
POST   /auth/2fa/generate          - Generate 2FA secret and QR code
POST   /auth/2fa/enable            - Enable 2FA with verification
POST   /auth/2fa/verify            - Verify 2FA token during login
POST   /auth/2fa/disable           - Disable 2FA
GET    /auth/2fa/backup-codes      - Get backup codes
POST   /auth/2fa/backup-codes/regenerate - Regenerate backup codes
```

### 2. Rate Limiting

#### Global Rate Limiting
- Default: 100 requests per minute per IP
- Configurable via environment variables
- Redis-backed storage for distributed systems

#### Custom Rate Limiters
```typescript
@StrictThrottle()    // 5 requests/minute (login, sensitive ops)
@NormalThrottle()    // 100 requests/minute (standard APIs)
@RelaxedThrottle()   // 1000 requests/minute (read-only ops)
```

#### Endpoint-Specific Limits
```typescript
// Login endpoint: 5 attempts per minute
@Throttle(5, 60)
@Post('login')
async login() { ... }

// Password reset: 3 attempts per hour
@Throttle(3, 3600)
@Post('forgot-password')
async forgotPassword() { ... }
```

#### Rate Limit Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000000
Retry-After: 60 (when exceeded)
```

### 3. Security Headers (Helmet)

Automatically configured headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 4. CORS Configuration

Configured to allow:
- Frontend URL from environment
- localhost:3000 (development)
- Credentials support
- Specific HTTP methods
- Specific headers

```typescript
app.enableCors({
  origin: [frontendUrl, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
```

### 5. Input Validation

#### Class-Validator Integration
- Automatic validation for all DTOs
- Whitelist mode (strip unknown properties)
- Transform mode (type conversion)
- Forbid non-whitelisted properties

```typescript
// Example validation
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  password: string;
}
```

### 6. Password Security

#### Bcrypt Hashing
- 10 salt rounds (configurable)
- Automatic password hashing on user creation
- Secure password comparison

#### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

#### Account Lockout
- 5 failed login attempts trigger lockout
- 30-minute lockout duration
- Automatic unlock after timeout

### 7. Database Security

#### MongoDB Best Practices
- No default admin credentials
- Connection string encryption
- Input sanitization
- Prepared statements (Mongoose)
- No direct query execution

#### Data Encryption
- Passwords: bcrypt hashing
- PINs: bcrypt hashing
- Refresh tokens: hashed storage
- Sensitive fields: encrypted at rest

### 8. API Security

#### Request Validation
- JSON schema validation
- Size limits on payloads
- File upload restrictions
- Query parameter sanitization

#### Error Handling
- No stack traces in production
- Generic error messages
- Detailed logging (server-side only)
- No sensitive data in errors

#### Response Security
- Consistent response format
- No data leakage
- Proper HTTP status codes
- Sanitized output

### 9. Logging & Monitoring

#### Winston Logger
- Structured logging
- Log levels (error, warn, info, debug)
- Daily log rotation
- Separate error logs
- Request/response logging

#### Audit Trail
- User activities logged
- Authentication attempts tracked
- Critical operations audited
- IP address logging

### 10. Dependency Security

#### Regular Updates
```bash
npm audit
npm audit fix
npm outdated
```

#### Security Scanning
- Automated vulnerability scanning
- CI/CD security checks
- Dependency version pinning

## Environment Variables

### Security-Related Variables
```env
# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt
BCRYPT_ROUNDS=10

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# CORS
FRONTEND_URL=https://your-frontend-domain.com

# Session
SESSION_SECRET=your-session-secret

# 2FA
APP_NAME=Restaurant POS
```

## Security Checklist

### Development
- [ ] Never commit secrets to version control
- [ ] Use environment variables for configuration
- [ ] Implement input validation on all endpoints
- [ ] Use parameterized queries (Mongoose)
- [ ] Enable HTTPS in production
- [ ] Implement proper error handling
- [ ] Log security events
- [ ] Regular dependency updates

### Production Deployment
- [ ] Change all default passwords
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set secure environment variables
- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerts
- [ ] Regular security audits
- [ ] Implement backup strategy
- [ ] Enable 2FA for admins
- [ ] Use strong JWT secrets (min 32 chars)

### API Security
- [ ] Implement authentication on all routes
- [ ] Use RBAC for authorization
- [ ] Validate all user inputs
- [ ] Sanitize database queries
- [ ] Implement rate limiting
- [ ] Log all security events
- [ ] Use HTTPS only
- [ ] Implement CORS properly

## Common Vulnerabilities & Protections

### 1. SQL Injection
**Protection:** Mongoose ORM with parameterized queries

### 2. XSS (Cross-Site Scripting)
**Protection:**
- Input validation and sanitization
- Content Security Policy headers
- Output encoding

### 3. CSRF (Cross-Site Request Forgery)
**Protection:**
- JWT tokens (not cookies)
- SameSite cookie attribute
- CORS configuration

### 4. Brute Force Attacks
**Protection:**
- Rate limiting
- Account lockout
- CAPTCHA (future enhancement)

### 5. DDoS Attacks
**Protection:**
- Rate limiting
- Request size limits
- Cloud-based DDoS protection (CDN)

### 6. Man-in-the-Middle (MITM)
**Protection:**
- HTTPS/TLS encryption
- HSTS headers
- Certificate pinning

### 7. Insecure Direct Object References (IDOR)
**Protection:**
- Authorization checks on all resources
- Company/branch ID validation
- User ownership verification

### 8. Sensitive Data Exposure
**Protection:**
- Password hashing (bcrypt)
- Encrypted connections (HTTPS)
- No sensitive data in logs/errors
- Secure token storage

## Incident Response

### Security Breach Protocol
1. **Immediate Actions:**
   - Identify affected systems
   - Isolate compromised resources
   - Revoke compromised credentials
   - Enable maintenance mode if needed

2. **Investigation:**
   - Review logs and audit trails
   - Identify attack vector
   - Assess data exposure
   - Document findings

3. **Remediation:**
   - Patch vulnerabilities
   - Reset affected credentials
   - Notify affected users
   - Implement additional controls

4. **Post-Incident:**
   - Conduct security review
   - Update security policies
   - Provide team training
   - Document lessons learned

## Security Testing

### Manual Testing
```bash
# Test rate limiting
for i in {1..110}; do curl http://localhost:5000/api/auth/login; done

# Test SQL injection
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com'\'' OR '\''1'\''='\''1","password":"test"}'

# Test XSS
curl -X POST http://localhost:5000/api/menu-items \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"<script>alert('\''XSS'\'')</script>"}'
```

### Automated Testing
```bash
# OWASP ZAP
zap-cli quick-scan http://localhost:5000

# npm audit
npm audit --production

# Snyk
snyk test
```

## Best Practices

### 1. Password Management
- Never store passwords in plain text
- Use bcrypt with sufficient rounds (10+)
- Implement password strength requirements
- Force password changes periodically
- Never log passwords

### 2. Token Management
- Use short-lived access tokens (15 min)
- Implement refresh token rotation
- Invalidate tokens on logout
- Store tokens securely (httpOnly cookies or secure storage)
- Never expose tokens in URLs

### 3. Error Handling
- Use generic error messages for users
- Log detailed errors server-side only
- Never expose stack traces in production
- Implement proper exception handling
- Monitor error rates

### 4. Code Security
- Validate all inputs
- Sanitize all outputs
- Use parameterized queries
- Avoid eval() and similar functions
- Keep dependencies updated
- Follow OWASP guidelines

### 5. Infrastructure Security
- Use HTTPS everywhere
- Keep servers updated
- Configure firewalls properly
- Use VPN for database access
- Implement network segregation
- Regular security patches

## Compliance

### GDPR
- User data encryption
- Right to erasure
- Data portability
- Consent management
- Breach notification procedures

### PCI DSS (for payment handling)
- Secure payment processing (via Stripe)
- No card data storage
- Secure network transmission
- Regular security testing

## Security Contacts

### Reporting Security Issues
Email: security@restaurantpos.com

### Security Team
- Security Lead: TBD
- DevOps Security: TBD
- Compliance Officer: TBD

## Updates & Maintenance

### Regular Security Tasks
- **Weekly:** Review logs and alerts
- **Monthly:** Dependency updates and audits
- **Quarterly:** Security assessments and penetration testing
- **Annually:** Full security audit and compliance review

### Security Update Process
1. Identify security vulnerability
2. Assess impact and severity
3. Develop and test fix
4. Deploy fix (emergency or scheduled)
5. Document and communicate
6. Monitor for issues

---

**Last Updated:** 2025-01-XX
**Version:** 1.0
**Maintained By:** Development Team

