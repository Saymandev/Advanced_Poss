import { Injectable } from '@nestjs/common';
import { SystemSettings } from './schemas/system-settings.schema';
import { SettingsService } from './settings.service';

@Injectable()
export class LoginSecurityService {
  private settingsCache: {
    settings: SystemSettings | null;
    lastFetched: number;
  } = {
    settings: null,
    lastFetched: 0,
  };
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Get system settings with caching
   */
  private async getSystemSettings(): Promise<SystemSettings> {
    const now = Date.now();
    if (
      this.settingsCache.settings &&
      now - this.settingsCache.lastFetched < this.CACHE_TTL
    ) {
      return this.settingsCache.settings;
    }

    const settings = await this.settingsService.getSystemSettings();
    this.settingsCache.settings = settings;
    this.settingsCache.lastFetched = now;
    return settings;
  }

  /**
   * Get security settings (max attempts, lockout duration)
   */
  async getSecuritySettings(): Promise<{
    maxAttempts: number;
    lockoutDuration: number; // in minutes
  }> {
    const settings = await this.getSystemSettings();
    return {
      maxAttempts: settings.security?.maxAttempts || 5,
      lockoutDuration: settings.security?.lockoutDuration || 30,
    };
  }

  /**
   * Check if account should be locked based on login attempts
   */
  async shouldLockAccount(
    currentAttempts: number,
  ): Promise<{ shouldLock: boolean; lockUntil: Date | null }> {
    const { maxAttempts, lockoutDuration } = await this.getSecuritySettings();

    if (currentAttempts >= maxAttempts) {
      const lockUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
      return { shouldLock: true, lockUntil };
    }

    return { shouldLock: false, lockUntil: null };
  }

  /**
   * Get password security settings for validation
   */
  async getPasswordSecuritySettings(): Promise<SystemSettings['security']> {
    const settings = await this.getSystemSettings();
    return settings.security || {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      maxAttempts: 5,
      lockoutDuration: 30,
    };
  }

  /**
   * Clear settings cache (call when settings are updated)
   */
  clearCache(): void {
    this.settingsCache.settings = null;
    this.settingsCache.lastFetched = 0;
  }
}

