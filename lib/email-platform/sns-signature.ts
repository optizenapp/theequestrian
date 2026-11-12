import { createVerify } from 'node:crypto';

export type SnsSignedMessage = {
  Type?: string;
  MessageId?: string;
  Message?: string;
  Subject?: string;
  Timestamp?: string;
  TopicArn?: string;
  Token?: string;
  SubscribeURL?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
};

const NOTIFICATION_FIELDS = ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'] as const;
const SUBSCRIPTION_FIELDS = ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'] as const;
const SNS_CERT_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/;
const CERT_FETCH_TIMEOUT_MS = 5000;

const certCache = new Map<string, string>();

function isTrustedCertUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && SNS_CERT_HOST.test(url.hostname) && url.pathname.endsWith('.pem');
  } catch {
    return false;
  }
}

function isAllowedTopic(topicArn: string): boolean {
  const allowed = (process.env.AWS_SNS_TOPIC_ARNS || '')
    .split(',')
    .map((arn) => arn.trim())
    .filter(Boolean);
  return allowed.length === 0 || allowed.includes(topicArn);
}

function buildStringToSign(message: SnsSignedMessage): string | null {
  const fields =
    message.Type === 'Notification'
      ? NOTIFICATION_FIELDS
      : message.Type === 'SubscriptionConfirmation' || message.Type === 'UnsubscribeConfirmation'
        ? SUBSCRIPTION_FIELDS
        : null;
  if (!fields) return null;
  let result = '';
  for (const field of fields) {
    const value = message[field];
    if (value === undefined) {
      if (field === 'Subject') continue;
      return null;
    }
    result += `${field}\n${value}\n`;
  }
  return result;
}

async function fetchSigningCert(url: string): Promise<string> {
  const cached = certCache.get(url);
  if (cached) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CERT_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`SNS signing cert fetch failed (${response.status})`);
    const pem = await response.text();
    certCache.set(url, pem);
    return pem;
  } finally {
    clearTimeout(timer);
  }
}

/** Verifies an SNS JSON envelope came from AWS (and, if AWS_SNS_TOPIC_ARNS is set, from an allowed topic). */
export async function verifySnsSignature(message: SnsSignedMessage): Promise<boolean> {
  try {
    const { Signature, SigningCertURL, SignatureVersion, TopicArn } = message;
    if (!Signature || !SigningCertURL || !TopicArn) return false;
    if (SignatureVersion !== '1' && SignatureVersion !== '2') return false;
    if (!isTrustedCertUrl(SigningCertURL) || !isAllowedTopic(TopicArn)) return false;
    const stringToSign = buildStringToSign(message);
    if (!stringToSign) return false;
    const pem = await fetchSigningCert(SigningCertURL);
    const verifier = createVerify(SignatureVersion === '1' ? 'RSA-SHA1' : 'RSA-SHA256');
    verifier.update(stringToSign, 'utf8');
    return verifier.verify(pem, Signature, 'base64');
  } catch (error: unknown) {
    console.error('SNS signature verification error', error instanceof Error ? error.message : String(error));
    return false;
  }
}
