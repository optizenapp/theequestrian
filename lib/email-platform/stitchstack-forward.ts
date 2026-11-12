const STITCHSTACK_EMAIL_EVENTS_URL = 'https://stitchstack.app/api/email/events';
const FORWARD_TIMEOUT_MS = 5000;
const MAX_LOGGED_BODY_CHARS = 500;

/**
 * Accepts a raw SES event, an SNS notification body, an array of those, or { events: [...] }.
 * Never throws: SES event processing must not depend on Stitch Stack availability.
 */
export async function forwardToStitchStack(payload: unknown): Promise<void> {
  const token = process.env.STITCHSTACK_EMAIL_TOKEN;
  if (!token) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
  try {
    const response = await fetch(STITCHSTACK_EMAIL_EVENTS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(
        'Stitch Stack email event forward failed',
        response.status,
        text.slice(0, MAX_LOGGED_BODY_CHARS)
      );
      return;
    }
    console.info('Stitch Stack email event forward', response.status, text.slice(0, MAX_LOGGED_BODY_CHARS));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Stitch Stack email event forward error', message);
  } finally {
    clearTimeout(timer);
  }
}
