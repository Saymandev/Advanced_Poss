import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';
// import { WinstonLoggerService } from '../../common/logger/winston.logger';
@Injectable()
export class TwoFactorService {
  // private readonly logger = new WinstonLoggerService('TwoFactorService');
  constructor(private configService: ConfigService) {}
  // Generate 2FA secret for a user
  async generateSecret(email: string): Promise<{ secret: string; qrCode: string }> {
    try {
      const appName = this.configService.get<string>('APP_NAME') || 'Restaurant POS';
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${appName} (${email})`,
        length: 32,
      });
      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);
      return {
        secret: secret.base32,
        qrCode,
      };
    } catch (error) {
      console.error('Failed to generate 2FA secret', error);
      throw error;
    }
  }
  // Verify 2FA token
  verifyToken(token: string, secret: string): boolean {
    try {
      if (!secret || !token) {
        console.error('Missing secret or token for 2FA verification');
        return false;
      }
      // Clean the token (remove any whitespace)
      const cleanToken = token.trim();
      // Verify the token with wider window first (5 steps = 2.5 minutes tolerance)
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: cleanToken,
        window: 5, // Allow 5 time steps (2.5 minutes) of tolerance for clock drift
      });
      if (!isValid) {
        // Try generating what the current token should be for debugging
        const currentToken = speakeasy.totp({
          secret,
          encoding: 'base32',
        });
        // Token verification failed
      }
      return isValid;
    } catch (error) {
      console.error('Failed to verify 2FA token', error);
      console.error('Secret:', secret ? `${secret.substring(0, 10)}...` : 'missing');
      console.error('Token:', token);
      return false;
    }
  }
  // Generate backup codes
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = this.generateRandomCode(8);
      codes.push(code);
    }
    return codes;
  }
  // Verify backup code
  verifyBackupCode(code: string, backupCodes: string[]): boolean {
    return backupCodes.includes(code);
  }
  // Remove used backup code
  removeBackupCode(code: string, backupCodes: string[]): string[] {
    return backupCodes.filter((c) => c !== code);
  }
  // Helper: Generate random code
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Format as XXXX-XXXX for 8 character codes
    if (length === 8) {
      return `${code.substring(0, 4)}-${code.substring(4)}`;
    }
    return code;
  }
}
