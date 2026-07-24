import speakeasy from "speakeasy";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { generateBackupCode } from "./crypto";

const APP_NAME = "KickMatch Hub";
const BACKUP_CODE_COUNT = 8;
const BCRYPT_ROUNDS_BACKUP_CODES = 10;

export interface TotpEnrollment {
  base32Secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export async function generateTotpEnrollment(accountLabel: string): Promise<TotpEnrollment> {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${accountLabel})`,
    issuer: APP_NAME,
    length: 20,
  });

  const otpauthUrl = secret.otpauth_url ?? "";
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { base32Secret: secret.base32, otpauthUrl, qrCodeDataUrl };
}

export function verifyTotpCode(base32Secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret: base32Secret,
    encoding: "base32",
    token: code,
    window: 1,
  });
}

export async function generateBackupCodes(): Promise<{ plaintext: string[]; hashed: string[] }> {
  const plaintext = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());
  const hashed = await Promise.all(plaintext.map((code) => bcrypt.hash(code, BCRYPT_ROUNDS_BACKUP_CODES)));
  return { plaintext, hashed };
}

export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<number | null> {
  for (let i = 0; i < hashedCodes.length; i += 1) {
    if (await bcrypt.compare(code, hashedCodes[i])) {
      return i;
    }
  }
  return null;
}