export interface PasswordRequirement {
  label: string;
  met: boolean;
}

const SPECIAL_CHARS = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'An uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'A lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'A digit (0-9)', met: /[0-9]/.test(password) },
    {
      label: 'A special character (!@#$…)',
      met: password.split('').some((c) => SPECIAL_CHARS.includes(c)),
    },
  ];
}

export function isStrongPassword(password: string): boolean {
  return getPasswordRequirements(password).every((r) => r.met);
}
