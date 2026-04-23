import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

function getSesRegion(): string {
  return process.env.AWS_SES_REGION || process.env.AWS_REGION || 'ap-southeast-2';
}

function createSesClient(): SESv2Client {
  return new SESv2Client({ region: getSesRegion() });
}

export function isSesConfigured(): boolean {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export type SesHtmlEmailInput = {
  fromEmailAddress: string;
  toAddresses: string[];
  replyToAddresses?: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  headers?: Array<{ name: string; value: string }>;
  tags?: Array<{ name: string; value: string }>;
};

export async function sendSesHtmlEmail(input: SesHtmlEmailInput): Promise<string> {
  if (!isSesConfigured()) {
    throw new Error('SES is not configured (missing AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)');
  }
  if (input.toAddresses.length === 0) {
    throw new Error('SES send requires at least one recipient');
  }

  const client = createSesClient();
  const configurationSetName = process.env.AWS_SES_CONFIGURATION_SET?.trim() || undefined;

  const command = new SendEmailCommand({
    FromEmailAddress: input.fromEmailAddress,
    Destination: { ToAddresses: input.toAddresses },
    ReplyToAddresses: input.replyToAddresses,
    ConfigurationSetName: configurationSetName,
    EmailTags: input.tags?.map((t) => ({ Name: t.name, Value: t.value })),
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: input.htmlBody, Charset: 'UTF-8' },
          ...(input.textBody
            ? { Text: { Data: input.textBody, Charset: 'UTF-8' } }
            : {}),
        },
        Headers: input.headers?.map((h) => ({ Name: h.name, Value: h.value })),
      },
    },
  });

  const out = await client.send(command);
  const id = out.MessageId?.trim();
  if (!id) {
    throw new Error('SES SendEmail returned no MessageId');
  }
  return id;
}
