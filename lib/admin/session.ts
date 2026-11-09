// Edge-safe (Web Crypto only): imported by middleware and Node route handlers.

export const ADMIN_COOKIE = 'admin-auth';
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Changing ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) signs every existing session out. */
async function signingKey(): Promise<CryptoKey | null> {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(`admin-session-v1:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Token format: `v1.<expiry epoch seconds>.<HMAC-SHA256 signature>`. */
export async function createAdminSession(): Promise<string> {
  const key = await signingKey();
  if (!key) throw new Error('Admin password not configured');
  const payload = `v1.${Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS}`;
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${payload}.${base64url(signature)}`;
}

export async function verifyAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const expiry = Number(parts[1]);
  if (!Number.isInteger(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;
  const signature = fromBase64url(parts[2]);
  if (!signature) return false;
  try {
    const key = await signingKey();
    if (!key) return false;
    return await crypto.subtle.verify('HMAC', key, signature, encoder.encode(`${parts[0]}.${parts[1]}`));
  } catch (error) {
    console.error('[admin-session] verify failed:', error instanceof Error ? error.message : 'unknown');
    return false;
  }
}
