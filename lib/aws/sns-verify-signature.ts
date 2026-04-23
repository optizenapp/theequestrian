import crypto from 'crypto';

const SNS_CERT_HOST =
  /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i;

function isAllowedSigningCertUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && SNS_CERT_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

function stringFields(msg: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(msg)) {
    if (typeof v === 'string') {
      out[k] = v;
    }
  }
  return out;
}

function buildStringToSign(s: Record<string, string>): string {
  const type = s.Type;
  if (type === 'Notification') {
    const parts = [s.Message, s.MessageId];
    if (typeof s.Subject === 'string' && s.Subject.length > 0) {
      parts.push(s.Subject);
    }
    parts.push(s.Type, s.Timestamp, s.TopicArn);
    return `${parts.join('\n')}\n`;
  }
  if (type === 'SubscriptionConfirmation' || type === 'UnsubscribeConfirmation') {
    return `${s.Message}\n${s.MessageId}\n${s.Type}\n${s.Timestamp}\n${s.TopicArn}\n`;
  }
  throw new Error(`Unsupported SNS message Type: ${type || '(missing)'}`);
}

export async function verifySnsHttpMessageSignature(
  message: Record<string, unknown>
): Promise<boolean> {
  const s = stringFields(message);
  const signatureVersion = s.SignatureVersion;
  const signatureB64 = s.Signature;
  const certUrl = s.SigningCertURL;
  if (!signatureVersion || !signatureB64 || !certUrl || !isAllowedSigningCertUrl(certUrl)) {
    return false;
  }

  let stringToSign: string;
  try {
    stringToSign = buildStringToSign(s);
  } catch {
    return false;
  }

  try {
    const certResponse = await fetch(certUrl, { cache: 'no-store' });
    if (!certResponse.ok) {
      return false;
    }
    const certPem = await certResponse.text();
    const sig = Buffer.from(signatureB64, 'base64');
    const data = Buffer.from(stringToSign, 'utf8');
    if (signatureVersion === '1') {
      return crypto.verify('RSA-SHA1', data, certPem, sig);
    }
    if (signatureVersion === '2') {
      return crypto.verify('RSA-SHA256', data, certPem, sig);
    }
    return false;
  } catch {
    return false;
  }
}
