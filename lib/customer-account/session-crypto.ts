import crypto from 'crypto';

const VERSION = 'v1';

function keyFor(secret: string, purpose: string): Buffer {
  return crypto.createHash('sha256').update(`customer-${purpose}-${VERSION}:${secret}`).digest();
}

/** AES-256-GCM, so cookie contents are both unreadable and tamper-evident. */
export function sealJson(value: unknown, secret: string, purpose: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFor(secret, purpose), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), body.toString('base64url'), tag.toString('base64url')].join('.');
}

export function unsealJson<T>(sealed: string | undefined, secret: string, purpose: string): T | null {
  if (!sealed) return null;
  const [version, iv, body, tag] = sealed.split('.');
  if (version !== VERSION || !iv || !body || !tag) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyFor(secret, purpose), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    const plain = Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]);
    return JSON.parse(plain.toString('utf8')) as T;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}
