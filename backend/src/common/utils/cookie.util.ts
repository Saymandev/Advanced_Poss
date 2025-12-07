import { Response } from 'express';

/**
 * Cookie utility functions for secure token storage
 */

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

// Cookie options for production
const getCookieOptions = (isProduction: boolean = false) => ({
  httpOnly: true, // Prevents JavaScript access (XSS protection)
  secure: isProduction, // HTTPS only in production
  sameSite: 'strict' as const, // CSRF protection
  path: '/',
});

/**
 * Set authentication cookies
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessTokenExpiresIn: string = '15m', // JWT expiresIn format
  refreshTokenExpiresIn: string = '7d', // JWT expiresIn format
  isProduction: boolean = false,
): void {
  const cookieOptions = getCookieOptions(isProduction);

  // Parse expiresIn to milliseconds
  const parseExpiresIn = (expiresIn: string): number => {
    if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60 * 1000; // minutes to ms
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 60 * 60 * 1000; // hours to ms
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 24 * 60 * 60 * 1000; // days to ms
    }
    return 15 * 60 * 1000; // default 15 minutes
  };

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: parseExpiresIn(accessTokenExpiresIn),
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: parseExpiresIn(refreshTokenExpiresIn),
  });
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(res: Response, isProduction: boolean = false): void {
  const cookieOptions = getCookieOptions(isProduction);

  res.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
}

/**
 * Get access token from cookie or header (for backward compatibility)
 */
export function getAccessToken(req: any): string | null {
  // Try cookie first (new method)
  if (req.cookies && req.cookies[ACCESS_TOKEN_COOKIE]) {
    return req.cookies[ACCESS_TOKEN_COOKIE];
  }

  // Fallback to Authorization header (backward compatibility)
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Get refresh token from cookie or body (for backward compatibility)
 */
export function getRefreshToken(req: any): string | null {
  // Try cookie first (new method)
  if (req.cookies && req.cookies[REFRESH_TOKEN_COOKIE]) {
    return req.cookies[REFRESH_TOKEN_COOKIE];
  }

  // Fallback to body (backward compatibility)
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }

  return null;
}

