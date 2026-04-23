export type CreatePaymentIntentInput = {
  amountCents: number;
  currencyCode: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
};

export type StripePaymentIntent = {
  id: string;
  client_secret: string | null;
  amount: number;
  currency: string;
  status: string;
};

function toStripeMetadata(metadata?: Record<string, string>): string {
  if (!metadata) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(metadata)) {
    params.append(`metadata[${key}]`, value);
  }
  return params.toString();
}

export async function createStripePaymentIntent(
  input: CreatePaymentIntentInput
): Promise<StripePaymentIntent> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  const body = new URLSearchParams({
    amount: String(input.amountCents),
    currency: input.currencyCode.toLowerCase(),
    automatic_payment_methods: 'enabled',
  });
  if (input.customerEmail) {
    body.append('receipt_email', input.customerEmail);
  }
  const metadata = toStripeMetadata(input.metadata);
  if (metadata) {
    body.append('expand[]', 'latest_charge');
    body.append('metadata_source', 'commerce_checkout');
    body.append('metadata', '');
    body.delete('metadata');
    for (const [key, value] of Object.entries(input.metadata || {})) {
      body.append(`metadata[${key}]`, value);
    }
  }

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
    },
    body: body.toString(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stripe payment intent create failed ${response.status}: ${errorText.slice(0, 500)}`);
  }
  const json = (await response.json()) as StripePaymentIntent;
  if (!json.id) {
    throw new Error('Stripe response missing payment intent id');
  }
  return json;
}
