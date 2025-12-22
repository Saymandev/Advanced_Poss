import { BillingCycle } from '../../subscriptions/schemas/subscription.schema';

/**
 * Gateway-specific billing interval configuration
 */
export interface GatewayBillingInterval {
  interval: string; // e.g., 'month', 'year'
  intervalCount?: number; // e.g., 1, 3 (for quarterly)
}

/**
 * PayPal-specific billing interval configuration
 */
export interface PayPalBillingInterval {
  intervalUnit: string; // e.g., 'MONTH', 'YEAR'
  intervalCount: number; // e.g., 1, 3 (for quarterly)
}

/**
 * Converts billing cycle to Stripe-compatible format
 * Stripe supports: 'day', 'week', 'month', 'year' with optional interval_count
 */
export function getStripeBillingInterval(billingCycle: BillingCycle | string): GatewayBillingInterval {
  switch (billingCycle) {
    case BillingCycle.MONTHLY:
    case 'monthly':
      return { interval: 'month', intervalCount: 1 };
    
    case BillingCycle.QUARTERLY:
    case 'quarterly':
      return { interval: 'month', intervalCount: 3 };
    
    case BillingCycle.YEARLY:
    case 'yearly':
      return { interval: 'year', intervalCount: 1 };
    
    default:
      // Default to monthly if unknown
      return { interval: 'month', intervalCount: 1 };
  }
}

/**
 * Converts billing cycle to PayPal-compatible format
 * PayPal supports: 'DAY', 'WEEK', 'MONTH', 'YEAR' with interval_count
 */
export function getPayPalBillingInterval(billingCycle: BillingCycle | string): PayPalBillingInterval {
  switch (billingCycle) {
    case BillingCycle.MONTHLY:
    case 'monthly':
      return { intervalUnit: 'MONTH', intervalCount: 1 };
    
    case BillingCycle.QUARTERLY:
    case 'quarterly':
      return { intervalUnit: 'MONTH', intervalCount: 3 };
    
    case BillingCycle.YEARLY:
    case 'yearly':
      return { intervalUnit: 'YEAR', intervalCount: 1 };
    
    default:
      // Default to monthly if unknown
      return { intervalUnit: 'MONTH', intervalCount: 1 };
  }
}

/**
 * Gets the number of days for a billing cycle (useful for manual payments)
 */
export function getBillingCycleDays(billingCycle: BillingCycle | string): number {
  switch (billingCycle) {
    case BillingCycle.MONTHLY:
    case 'monthly':
      return 30;
    
    case BillingCycle.QUARTERLY:
    case 'quarterly':
      return 90;
    
    case BillingCycle.YEARLY:
    case 'yearly':
      return 365;
    
    default:
      return 30;
  }
}

/**
 * Generic function to get billing interval for any gateway
 * Extend this when adding new payment gateways
 */
export function getGatewayBillingInterval(
  gateway: string,
  billingCycle: BillingCycle | string
): GatewayBillingInterval | PayPalBillingInterval {
  switch (gateway.toLowerCase()) {
    case 'stripe':
      return getStripeBillingInterval(billingCycle);
    
    case 'paypal':
      return getPayPalBillingInterval(billingCycle);
    
    // Add more gateways here as needed
    // case 'razorpay':
    //   return getRazorpayBillingInterval(billingCycle);
    
    default:
      // For gateways that don't support recurring intervals (e.g., mobile wallets),
      // return monthly as default
      return getStripeBillingInterval(billingCycle);
  }
}

