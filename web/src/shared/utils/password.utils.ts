/**
 * Shared password validation utilities
 *
 * These rules must stay in sync with the backend Password value object
 * (api/src/features/auth/domain/value-objects/password.vo.ts)
 */

export const passwordRequirements = {
  minLength: (password: string) => password.length >= 8,
  hasUpperCase: (password: string) => /[A-Z]/.test(password),
  hasLowerCase: (password: string) => /[a-z]/.test(password),
  hasNumber: (password: string) => /[0-9]/.test(password),
  hasSpecialChar: (password: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
};

export const passwordRequirementLabels = [
  {
    key: 'minLength' as const,
    label: 'Mínimo 8 caracteres',
    check: passwordRequirements.minLength,
  },
  {
    key: 'hasUpperCase' as const,
    label: 'Al menos una mayúscula',
    check: passwordRequirements.hasUpperCase,
  },
  {
    key: 'hasLowerCase' as const,
    label: 'Al menos una minúscula',
    check: passwordRequirements.hasLowerCase,
  },
  { key: 'hasNumber' as const, label: 'Al menos un número', check: passwordRequirements.hasNumber },
  {
    key: 'hasSpecialChar' as const,
    label: 'Al menos un carácter especial (!@#$%^&*)',
    check: passwordRequirements.hasSpecialChar,
  },
];

/**
 * Validate all password requirements at once
 * @returns null if valid, or error message string if invalid
 */
export function validatePasswordStrength(password: string): string | null {
  if (!passwordRequirements.minLength(password)) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (!passwordRequirements.hasUpperCase(password)) {
    return 'La contraseña debe contener al menos una mayúscula';
  }
  if (!passwordRequirements.hasLowerCase(password)) {
    return 'La contraseña debe contener al menos una minúscula';
  }
  if (!passwordRequirements.hasNumber(password)) {
    return 'La contraseña debe contener al menos un número';
  }
  if (!passwordRequirements.hasSpecialChar(password)) {
    return 'La contraseña debe contener al menos un carácter especial';
  }
  return null;
}
