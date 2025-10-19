# Stripe Payment Integration Setup Guide

## Backend Configuration

### 1. Environment Variables
Add these to your `backend/.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Update Configuration File
Add Stripe config to `backend/src/config/configuration.ts`:

```typescript
stripe: {
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
},
```

## Frontend Configuration

### 1. Environment Variables
Add these to your `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

## Stripe Dashboard Setup

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Create a new account
3. Get your API keys from the dashboard

### 2. Create Products and Prices
1. Go to Products in Stripe Dashboard
2. Create products for each subscription plan:
   - **Basic Plan**: Free trial
   - **Premium Plan**: ৳2,500/month
   - **Enterprise Plan**: ৳5,000/month

### 3. Set Up Webhooks
1. Go to Webhooks in Stripe Dashboard
2. Add endpoint: `https://yourdomain.com/api/v1/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`

## Testing

### 1. Test Cards
Use these test card numbers:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

### 2. Test Flow
1. Register with Premium/Enterprise plan
2. Get redirected to payment page
3. Use test card: 4242 4242 4242 4242
4. Complete payment
5. Get redirected to success page
6. Check dashboard for active subscription

## API Endpoints

### Payment Endpoints
- `POST /api/v1/payments/create-payment-intent` - Create payment intent
- `POST /api/v1/payments/create-checkout-session` - Create checkout session
- `POST /api/v1/payments/confirm-payment` - Confirm payment
- `POST /api/v1/payments/webhook` - Stripe webhook handler

### Example Usage

#### Create Payment Intent
```bash
curl -X POST http://localhost:5000/api/v1/payments/create-payment-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "companyId": "507f1f77bcf86cd799439011",
    "planName": "premium"
  }'
```

#### Create Checkout Session
```bash
curl -X POST http://localhost:5000/api/v1/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "companyId": "507f1f77bcf86cd799439011",
    "planName": "premium",
    "successUrl": "https://yourapp.com/payment/success",
    "cancelUrl": "https://yourapp.com/payment/cancel"
  }'
```

## Security Notes

1. **Never expose secret keys** in frontend code
2. **Use HTTPS** in production
3. **Verify webhook signatures** to prevent fraud
4. **Store sensitive data** securely
5. **Use environment variables** for all keys

## Production Checklist

- [ ] Update to live Stripe keys
- [ ] Set up production webhook endpoint
- [ ] Test with real payment methods
- [ ] Set up monitoring and alerts
- [ ] Configure proper error handling
- [ ] Set up subscription management
- [ ] Test webhook reliability

## Troubleshooting

### Common Issues
1. **Webhook not receiving events**: Check endpoint URL and signature verification
2. **Payment intent creation fails**: Verify Stripe keys and company ID
3. **Frontend payment form not loading**: Check publishable key and Elements setup
4. **Subscription not activating**: Check webhook event handling

### Debug Mode
Enable Stripe debug mode by adding to your environment:
```env
STRIPE_DEBUG=true
```

This will provide detailed logs for troubleshooting.
