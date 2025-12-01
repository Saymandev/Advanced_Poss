import { BadRequestException } from '@nestjs/common';
import { SystemSettings } from '../../modules/settings/schemas/system-settings.schema';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordValidator {
  /**
   * Validates a password against system security settings
   */
  static validate(
    password: string,
    securitySettings: SystemSettings['security'],
  ): PasswordValidationResult {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < securitySettings.minLength) {
      errors.push(
        `Password must be at least ${securitySettings.minLength} characters long`,
      );
    }

    // Check uppercase requirement
    if (securitySettings.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase requirement
    if (securitySettings.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check numbers requirement
    if (securitySettings.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check special characters requirement
    if (
      securitySettings.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates password and throws BadRequestException if invalid
   */
  static validateOrThrow(
    password: string,
    securitySettings: SystemSettings['security'],
  ): void {
    const result = this.validate(password, securitySettings);
    if (!result.isValid) {
      throw new BadRequestException(result.errors.join('; '));
    }
  }
}

