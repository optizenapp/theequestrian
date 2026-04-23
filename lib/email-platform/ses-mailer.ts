import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

type SesCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

function getSesCredentials(): SesCredentials {
  const accessKeyId = process.env.SES_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SES_AWS_SECRET_ACCESS_KEY;
  const region = process.env.SES_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2';
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing SES_AWS_ACCESS_KEY_ID or SES_AWS_SECRET_ACCESS_KEY');
  }
  return { accessKeyId, secretAccessKey, region };
}

function getSesFromEmail(): string {
  return process.env.SES_AWS_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'support@theequestrian.com.au';
}

export function isSesConfigured(): boolean {
  return Boolean(process.env.SES_AWS_ACCESS_KEY_ID && process.env.SES_AWS_SECRET_ACCESS_KEY);
}

function getClient(): SESv2Client {
  const creds = getSesCredentials();
  return new SESv2Client({
    region: creds.region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

type SendInput = {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string[];
  headers?: Array<{ name: string; value: string }>;
  tags?: Array<{ name: string; value: string }>;
  text?: string;
};

export async function sendSesEmail(input: SendInput): Promise<string> {
  const client = getClient();
  const configSet = process.env.SES_AWS_CONFIGURATION_SET;
  const command = new SendEmailCommand({
    FromEmailAddress: input.from || getSesFromEmail(),
    Destination: {
      ToAddresses: input.to,
    },
    ReplyToAddresses: input.replyTo,
    ConfigurationSetName: configSet || undefined,
    EmailTags: input.tags?.map((tag) => ({ Name: tag.name, Value: tag.value })),
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: input.html, Charset: 'UTF-8' },
          ...(input.text ? { Text: { Data: input.text, Charset: 'UTF-8' } } : {}),
        },
        ...(input.headers
          ? {
              Headers: input.headers.map((header) => ({
                Name: header.name,
                Value: header.value,
              })),
            }
          : {}),
      },
    },
  });

  const response = await client.send(command);
  const messageId = response.MessageId;
  if (!messageId) {
    throw new Error('SES send returned no MessageId');
  }
  return messageId;
}
