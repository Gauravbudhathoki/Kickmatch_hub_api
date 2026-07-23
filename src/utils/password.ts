import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const COMMON_PASSWORDS = new Set(
  [
    "password", "password1", "password123", "123456", "12345678", "123456789",
    "qwerty", "qwerty123", "letmein", "welcome", "welcome1", "admin", "admin123",
    "iloveyou", "monkey", "dragon", "football", "baseball", "master", "sunshine",
    "princess", "abc123", "111111", "123123", "changeme", "trustno1",
  ].map((p) => p.toLowerCase())
);

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}


export function validatePasswordPolicy(
  password: string,
  context?: { username?: string; email?: string }
): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long.");
  }
  if (password.length > 128) {
    errors.push("Password must be no more than 128 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one digit.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character.");
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("This password is too common. Please choose a different one.");
  }

  const lowerPw = password.toLowerCase();
  const username = context?.username?.toLowerCase();
  const emailLocal = context?.email?.split("@")[0]?.toLowerCase();
  if (username && username.length >= 3 && lowerPw.includes(username)) {
    errors.push("Password must not contain your username.");
  }
  if (emailLocal && emailLocal.length >= 3 && lowerPw.includes(emailLocal)) {
    errors.push("Password must not contain your email address.");
  }

  return { valid: errors.length === 0, errors };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Checks a candidate password against stored password history hashes to
 * prevent reuse of the last N passwords.
 */
export async function isPasswordReused(candidate: string, previousHashes: string[]): Promise<boolean> {
  for (const hash of previousHashes) {
    // eslint-disable-next-line no-await-in-loop
    if (await bcrypt.compare(candidate, hash)) {
      return true;
    }
  }
  return false;
}