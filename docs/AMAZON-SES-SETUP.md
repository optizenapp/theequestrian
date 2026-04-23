# Amazon SES (replace Resend)

## Environment variables

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — IAM user with `ses:SendEmail` (and typically `ses:GetEmailIdentity`).
- `AWS_REGION` or `AWS_SES_REGION` — e.g. `ap-southeast-2`.
- `AWS_SES_FROM_EMAIL` — verified from address (e.g. `support@theequestrian.com.au`).
- `AWS_SES_CONFIGURATION_SET` — optional; enables event publishing (bounces, complaints, opens/clicks if configured).
- `AWS_SNS_WEBHOOK_SECRET` — optional; if set, SNS HTTPS deliveries must include header `x-sns-webhook-secret: <value>`.

## Transactional + marketing sends

All application sends use `lib/email-platform/ses-mailer.ts` (`SendEmail` SESv2 API).

## Review emails (delayed)

Delayed review requests are stored in `review_email_sends` (`email_subject`, `email_html`, `email_from`) and sent by Vercel Cron:

- `GET|POST /api/cron/review-emails` with `Authorization: Bearer <CRON_SECRET>` (same as other crons).

Run DB migration once:

- `scripts/migrate-review-email-ses-payload.sql`

## Event tracking (opens, clicks, bounces)

1. SES configuration set → event destination → SNS topic.
2. SNS HTTPS subscription → `https://<your-domain>/api/webhooks/aws/ses-sns`
3. Confirm the subscription (this endpoint auto-confirms `SubscriptionConfirmation` when the SNS signature verifies).

Legacy Resend webhook URL returns **410 Gone**: `/api/webhooks/resend/events`.
