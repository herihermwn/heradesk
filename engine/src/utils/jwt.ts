import { config } from "../config/env";

const encoder = new TextEncoder();

interface JWTPayload {
  userId: string;
  username: string;
  role: "admin" | "cs";
  iat: number;
  exp: number;
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function createSignature(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(config.jwt.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

async function verifySignature(data: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(config.jwt.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signatureBytes = base64UrlDecode(signature);
  return crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(data));
}

export async function signToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = parseExpiry(config.jwt.expiresIn);

  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const signature = await createSignature(`${headerB64}.${payloadB64}`);

  return `${headerB64}.${payloadB64}.${signature}`;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;

    const isValid = await verifySignature(`${headerB64}.${payloadB64}`, signature);
    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload: JWTPayload = JSON.parse(payloadJson);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 minutes

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 60 * 60;
    case "d": return value * 60 * 60 * 24;
    default: return 900;
  }
}
