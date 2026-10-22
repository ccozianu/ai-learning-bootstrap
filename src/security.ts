import {
  createHash,
  hkdfSync,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { readFile } from "node:fs/promises";
export const token = () => randomBytes(32).toString("base64url");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const codeDigest = (secret: string, id: string, code: string) =>
  createHmac("sha256", deriveKey(secret, "email-code"))
    .update(`${id}:${code}`)
    .digest("hex");
export function equal(a: string, b: string): boolean {
  return (
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export async function approved(email: string, file: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!/^[^@\s]+@gmail\.com$/.test(normalized)) return false;
  try {
    const lines = (await readFile(file, "utf8"))
      .split(/\r?\n/)
      .map((line) => normalizeEmail(line.split("#")[0]));
    return lines.includes(normalized);
  } catch {
    return false;
  }
}
export function trustedOrigin(
  origin: string | undefined,
  expected: string,
): boolean {
  return origin === expected;
}

export const deriveKey = (secret: string, purpose: string) =>
  Buffer.from(
    hkdfSync("sha256", secret, "ai-learning-v1", purpose, 32),
  ).toString("hex");
