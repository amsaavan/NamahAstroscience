import crypto from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";

// ─── OTP Store (in-memory, single-use, 10-min expiry) ──────────────────────

type OtpEntry = { otp: string; expiresAt: number; lastSentAt: number; attempts: number };
// Single admin slot — only one OTP active at a time
let otpStore: OtpEntry | null = null;

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RATE_LIMIT_MS = 60 * 1000; // 1 OTP per 60 seconds

export function canSendOtp(): boolean {
  if (!otpStore) return true;
  return Date.now() - otpStore.lastSentAt >= OTP_RATE_LIMIT_MS;
}

export function nextOtpAllowedInMs(): number {
  if (!otpStore) return 0;
  const remaining = OTP_RATE_LIMIT_MS - (Date.now() - otpStore.lastSentAt);
  return Math.max(0, remaining);
}

export function generateOtp(): string {
  const otp = crypto.randomInt(100000, 999999).toString();
  const now = Date.now();
  otpStore = { otp, expiresAt: now + OTP_TTL_MS, lastSentAt: now, attempts: 0 };
  return otp;
}

export function verifyOtp(input: string): boolean {
  if (!otpStore) return false;
  if (Date.now() > otpStore.expiresAt || otpStore.attempts >= 5) {
    otpStore = null; // lockout completely if expired or too many failed attempts
    return false;
  }
  
  const valid = input === otpStore.otp;
  if (valid) {
    otpStore = null; // single-use
  } else {
    otpStore.attempts += 1;
  }
  return valid;
}

// ─── JWT Session (HMAC-SHA256, no external packages) ───────────────────────

function getJwtSecret(): string {
  return process.env.ADMIN_JWT_SECRET ?? "";
}

export function isAuthConfigValid(): boolean {
  return Boolean(getJwtSecret());
}

function base64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signSessionJwt(): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      role: "admin",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    })
  );
  const data = `${header}.${payload}`;
  const sig = crypto
    .createHmac("sha256", getJwtSecret())
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${sig}`;
}

export function verifySessionJwt(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, payload, sig] = parts;
    const data = `${header}.${payload}`;
    const expected = crypto
      .createHmac("sha256", getJwtSecret())
      .update(data)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
      
    // Security enhancement: Prevent timing attacks
    const sigBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return false;
    }
    
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    return decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
