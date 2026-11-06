export type PasswordStrength = 'too-short' | 'weak' | 'fair' | 'strong';

export const MIN_PASSWORD_LENGTH = 8;

const LABELS: Record<PasswordStrength, string> = {
  'too-short': `Too short: use at least ${MIN_PASSWORD_LENGTH} characters`,
  weak: 'Weak: add length, numbers or symbols',
  fair: 'Fair: a longer password or a symbol would help',
  strong: 'Strong password',
};

/**
 * Rough client-side strength estimate: length plus the number of character
 * kinds used. Only a hint; the server decides what it accepts.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length < MIN_PASSWORD_LENGTH) return 'too-short';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  const score = kinds + (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0);
  if (score >= 4) return 'strong';
  if (score >= 3) return 'fair';
  return 'weak';
}

export function passwordStrengthLabel(strength: PasswordStrength): string {
  return LABELS[strength];
}
