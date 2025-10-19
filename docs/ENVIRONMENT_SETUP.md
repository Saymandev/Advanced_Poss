# Environment Variables Setup Guide

## Overview

This guide will help you set up environment variables for both the frontend and backend of the Advanced Restaurant POS system.

---

## 📋 **Quick Start**

### **Frontend Setup**

1. Navigate to the `frontend` directory
2. Copy the example environment file:
   ```bash
   cd frontend
   cp env.example.txt .env.local
   ```
3. Edit `.env.local` with your actual values
4. Restart the development server

### **Backend Setup**

1. Navigate to the `backend` directory
2. Copy the example environment file:
   ```bash
   cd backend
   cp env.example.txt .env
   ```
3. Edit `.env` with your actual values
4. Restart the backend server

---

## 🔐 **Security Best Practices**

### **IMPORTANT:**
- ❌ **NEVER** commit `.env`, `.env.local`, or `.env.production` files to version control
- ✅ **ALWAYS** use strong, unique secrets for production
- ✅ **ROTATE** secrets regularly
- ✅ **USE** environment-specific values (dev, staging, prod)
- ✅ **STORE** production secrets in secure vaults (AWS Secrets Manager, Azure Key Vault, etc.)

---

## 🎯 **Required Variables**

### **Frontend (Minimum for Development)**

```env
# Must have for basic functionality
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Backend (Minimum for Development)**

```env
# Must have for basic functionality
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/restaurant-pos
JWT_SECRET=your-secure-jwt-secret-min-32-characters
CORS_ORIGIN=http://localhost:3000
```

---

## 📦 **Optional Services**

### **1. Payment Processing (Stripe)**

**Why you need it:** Process credit card payments, manage subscriptions

```env
# Frontend
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Backend
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Setup:**
1. Create account at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard → Developers → API keys
3. Set up webhooks for subscription events

### **2. Email Service (SMTP)**

**Why you need it:** Send order confirmations, password resets, notifications

```env
# Backend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@yourrestaurant.com
```

**Setup Options:**

**A. Gmail (Development)**
1. Enable 2FA on your Google account
2. Generate App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use the generated password

**B. Mailtrap (Testing)**
```env
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-username
EMAIL_PASSWORD=your-mailtrap-password
```

**C. SendGrid (Production)**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

### **3. SMS Notifications (Twilio)**

**Why you need it:** Send order updates, verification codes via SMS

```env
# Backend
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
SMS_ENABLED=true
```

**Setup:**
1. Create account at [twilio.com](https://www.twilio.com)
2. Get Account SID and Auth Token from Console
3. Buy a phone number or use trial number

### **4. AI Insights (OpenAI)**

**Why you need it:** Generate business insights, predictions, recommendations

```env
# Backend
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
AI_FEATURES_ENABLED=true
```

**Setup:**
1. Create account at [platform.openai.com](https://platform.openai.com)
2. Generate API key from API Keys section
3. Add billing method for production use

### **5. Image Upload (Cloudinary)**

**Why you need it:** Store menu item images, staff photos, restaurant branding

```env
# Backend
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=restaurant-pos
```

**Setup:**
1. Create free account at [cloudinary.com](https://cloudinary.com)
2. Get credentials from Dashboard
3. Configure upload presets for different image types

### **6. Redis (Caching)**

**Why you need it:** Speed up API responses, session management, real-time features

```env
# Both Frontend & Backend
REDIS_URL=redis://localhost:6379
```

**Setup:**

**A. Local (Development)**
```bash
# Mac
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis

# Windows
# Download from https://redis.io/download
```

**B. Cloud (Production)**
- [Redis Cloud](https://redis.com/cloud/) - Free tier available
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)
- [Azure Cache for Redis](https://azure.microsoft.com/en-us/services/cache/)

### **7. Database (MongoDB)**

**Why you need it:** Store all application data

```env
# Backend
MONGODB_URI=mongodb://localhost:27017/restaurant-pos
```

**Setup:**

**A. Local (Development)**
```bash
# Mac
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt install mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
```

**B. Cloud (Production)**
1. Create cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Get connection string
3. Whitelist your IP addresses
4. Create database user

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/restaurant-pos?retryWrites=true&w=majority
```

---

## 🎛️ **Environment-Specific Configurations**

### **Development**

```env
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
MOCK_PAYMENT=true
SKIP_EMAIL=true
SEED_DATABASE=false
```

### **Staging**

```env
NODE_ENV=staging
DEBUG=true
LOG_LEVEL=info
MOCK_PAYMENT=false
SKIP_EMAIL=false
SENTRY_ENABLED=true
```

### **Production**

```env
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error
MOCK_PAYMENT=false
SKIP_EMAIL=false
SENTRY_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=50
```

---

## 🔍 **Feature Flags**

Control which features are enabled:

```env
# Backend
ENABLE_2FA=true                  # Two-factor authentication
ENABLE_EMAIL_VERIFICATION=true   # Verify email on signup
ENABLE_SMS_NOTIFICATIONS=false   # SMS for order updates
ENABLE_AI_INSIGHTS=false         # AI-powered business insights
ENABLE_LOYALTY_PROGRAM=true      # Customer loyalty points
ENABLE_QR_ORDERING=true          # QR code table ordering
ENABLE_MULTI_BRANCH=true         # Multiple restaurant locations
ENABLE_WEBHOOKS=true             # Webhook integrations

# Frontend
NEXT_PUBLIC_ENABLE_2FA=true
NEXT_PUBLIC_ENABLE_AI_INSIGHTS=true
NEXT_PUBLIC_ENABLE_LOYALTY_PROGRAM=true
NEXT_PUBLIC_ENABLE_QR_ORDERING=true
```

---

## 🎯 **Business Configuration**

Customize business rules:

```env
# Tax & Fees
TAX_RATE=0.08           # 8% sales tax
SERVICE_CHARGE=0.10     # 10% service charge
DELIVERY_FEE=5.00       # $5 delivery fee
MIN_ORDER_AMOUNT=10.00  # Minimum $10 order

# Loyalty Program Tiers
LOYALTY_POINTS_PER_DOLLAR=1    # 1 point per dollar spent
LOYALTY_BRONZE_THRESHOLD=0     # Bronze: 0+ points
LOYALTY_SILVER_THRESHOLD=100   # Silver: 100+ points
LOYALTY_GOLD_THRESHOLD=500     # Gold: 500+ points
LOYALTY_PLATINUM_THRESHOLD=1000 # Platinum: 1000+ points
```

---

## 🚀 **Deployment**

### **Vercel (Frontend)**

1. Connect your repository
2. Add environment variables in Settings → Environment Variables
3. Deploy!

### **Heroku (Backend)**

```bash
heroku config:set NODE_ENV=production
heroku config:set PORT=4000
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
# ... add all other variables
```

### **Docker**

Create a `.env` file in the project root:

```env
# All backend environment variables
```

Then run:
```bash
docker-compose up -d
```

---

## ✅ **Verification Checklist**

- [ ] Frontend starts without errors
- [ ] Backend connects to database
- [ ] API requests work from frontend to backend
- [ ] Authentication works (login/register)
- [ ] Emails are sent (if configured)
- [ ] Payments work (if configured)
- [ ] Redis connection successful (if configured)
- [ ] Images upload successfully (if configured)
- [ ] AI features work (if configured)

---

## 🔧 **Troubleshooting**

### **Frontend can't connect to backend**
- Check `NEXT_PUBLIC_API_URL` matches backend address
- Verify CORS is configured correctly in backend
- Check backend is running on specified PORT

### **Database connection fails**
- Verify MongoDB is running
- Check connection string format
- Whitelist IP in MongoDB Atlas
- Verify database user credentials

### **JWT token errors**
- Ensure `JWT_SECRET` is at least 32 characters
- Must be the same between frontend and backend
- Check token expiration settings

### **Email not sending**
- Verify SMTP credentials
- Check if port 587 is open
- Enable "Less secure app access" for Gmail
- Use app-specific password for Gmail

### **Stripe webhooks failing**
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:4000/api/webhooks/stripe`
- Verify webhook secret matches
- Check endpoint is publicly accessible in production

---

## 📚 **Additional Resources**

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Twilio Documentation](https://www.twilio.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

---

## 🆘 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Review error logs
3. Verify all required variables are set
4. Check service status pages
5. Create an issue in the repository

---

**Remember:** Keep your secrets secret! 🔐

