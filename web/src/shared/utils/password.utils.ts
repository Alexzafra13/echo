/**
 * Shared password validation utilities
 *
 * These rules must stay in sync with the backend Password value object
 * (api/src/features/auth/domain/value-objects/password.vo.ts)
 */

import i18n from '@shared/i18n';

export const passwordRequirements = {
  minLength: (password: string) => password.length >= 8,
  hasUpperCase: (password: string) => /[A-Z]/.test(password),
  hasLowerCase: (password: string) => /[a-z]/.test(password),
  hasNumber: (password: string) => /[0-9]/.test(password),
  hasSpecialChar: (password: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
};

export function getPasswordRequirementLabels() {
  return [
    {
      key: 'minLength' as const,
      label: i18n.t('auth.passwordRules.minLength'),
      check: passwordRequirements.minLength,
    },
    {
      key: 'hasUpperCase' as const,
      label: i18n.t('auth.passwordRules.hasUpperCase'),
      check: passwordRequirements.hasUpperCase,
    },
    {
      key: 'hasLowerCase' as const,
      label: i18n.t('auth.passwordRules.hasLowerCase'),
      check: passwordRequirements.hasLowerCase,
    },
    {
      key: 'hasNumber' as const,
      label: i18n.t('auth.passwordRules.hasNumber'),
      check: passwordRequirements.hasNumber,
    },
    {
      key: 'hasSpecialChar' as const,
      label: i18n.t('auth.passwordRules.hasSpecialChar'),
      check: passwordRequirements.hasSpecialChar,
    },
  ];
}

/**
 * Validate all password requirements at once
 * @returns null if valid, or error message string if invalid
 */
export function validatePasswordStrength(password: string): string | null {
  const t = i18n.t.bind(i18n);
  if (!passwordRequirements.minLength(password)) {
    return t('auth.passwordRules.errorMinLength');
  }
  if (!passwordRequirements.hasUpperCase(password)) {
    return t('auth.passwordRules.errorUpperCase');
  }
  if (!passwordRequirements.hasLowerCase(password)) {
    return t('auth.passwordRules.errorLowerCase');
  }
  if (!passwordRequirements.hasNumber(password)) {
    return t('auth.passwordRules.errorNumber');
  }
  if (!passwordRequirements.hasSpecialChar(password)) {
    return t('auth.passwordRules.errorSpecialChar');
  }
  return null;
}
