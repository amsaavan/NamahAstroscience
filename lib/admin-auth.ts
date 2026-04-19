import crypto from "crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";

// ─── OTP helpers (cookie-backed, survives HMR & serverless) ────────────────
// The OTP value itself is never stored server-side.
// Instead we issue a signed cookie: HMAC(otp + "|" + expiresAt) + "|" + expiresAt
// so the browser holds the token and we re-derive the expected HMAC on verify.

const OTP_TTL_MS        = 10 * 60 * 1000; // 10 minutes
const OTP_RATE_LIMIT_MS = 60 * 1000;       // 1 OTP per 60 seconds
export const OTP_COOKIE  = "admin_otp_tok";

export function getOtpSecret(): string {
  return process.env.ADMIN_JWT_SECRET ?? "fallback-dev-secret";
}

/** Build the signed OTP cookie value: `hmac|expiresAt` */
export function buildOtpCookieValue(otp: string, expiresAt: number): string {
  const payload = `${otp}|${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", getOtpSecret())
    .update(payload)
    .digest("hex");
  return `${hmac}|${expiresAt}`;
}

/** Returns the OTP TTL in seconds (for the cookie max-age) */
export function otpTtlSeconds(): number {
  return OTP_TTL_MS / 1000;
}

/** Rate-limit guard — stored in a module-level variable.
 *  In serverless, this only guards within the same instance (good enough;
 *  the cookie TTL prevents reuse across instances). */
let _lastSentAt = 0;

export function canSendOtp(): boolean {
  return Date.now() - _lastSentAt >= OTP_RATE_LIMIT_MS;
}

export function nextOtpAllowedInMs(): number {
  return Math.max(0, OTP_RATE_LIMIT_MS - (Date.now() - _lastSentAt));
}

export function generateOtp(): string {
  _lastSentAt = Date.now();
  return crypto.randomInt(100_000, 999_999).toString();
}

/**
 * Verify an OTP against the cookie token.
 * @param input  - the 6-digit code the user entered
 * @param cookieValue - the value of the OTP_COOKIE set during /send
 */
export function verifyOtp(input: string, cookieValue: string): boolean {
  if (!cookieValue) return false;
  const parts = cookieValue.split("|");
  if (parts.length !== 2) return false;
  const [storedHmac, expiresAtStr] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || Date.now() > expiresAt) return false;

  // Re-derive expected HMAC for the submitted OTP
  const expectedPayload = `${input}|${expiresAt}`;
  const expectedHmac = crypto
    .createHmac("sha256", getOtpSecret())
    .update(expectedPayload)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (storedHmac.length !== expectedHmac.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(storedHmac, "hex"),
    Buffer.from(expectedHmac, "hex")
  );
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
