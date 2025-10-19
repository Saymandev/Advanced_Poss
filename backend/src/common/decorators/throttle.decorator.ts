import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttl: number;
}

/**
 * Custom throttle decorator for specific endpoints
 * @param limit - Maximum number of requests
 * @param ttl - Time to live in seconds
 */
export const Throttle = (limit: number, ttl: number) =>
  SetMetadata(THROTTLE_KEY, { limit, ttl });

/**
 * Strict rate limit for sensitive operations (e.g., login)
 */
export const StrictThrottle = () => Throttle(5, 60); // 5 requests per minute

/**
 * Normal rate limit for regular API endpoints
 */
export const NormalThrottle = () => Throttle(100, 60); // 100 requests per minute

/**
 * Relaxed rate limit for read-only operations
 */
export const RelaxedThrottle = () => Throttle(1000, 60); // 1000 requests per minute

