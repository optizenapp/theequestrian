import express from 'express';
import crypto from 'crypto';
import { config } from './config';
import { initDb } from './db';
import { loadTagRates, loadVendorRates } from './csv/loadRates';
import { loadSellerMapping } from './csv/loadSellerMapping';
import { getProductById } from './webkul/products';
import { processProduct } from './processor';
import { webkulQueue } from './queue/limiter';

const app = express();
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString();
    },
  })
);

let vendorRates = loadVendorRates();
let tagRates = loadTagRates();
let sellerMapping = loadSellerMapping();

function verifyWebhook(req: express.Request, rawBody: string): boolean {
  if (!config.webkulWebhookSecret) return true;
  const signature = req.header('x-webkul-signature') || '';
  const expected = crypto
    .createHmac('sha256', config.webkulWebhookSecret)
    .update(rawBody)
    .digest('hex');
  return signature === expected;
}

app.post('/webhooks/product', async (req, res) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    if (!verifyWebhook(req, rawBody)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const eventId = req.header('x-webkul-event-id') || null;
    const productId = req.body?.product_id || req.body?.id || req.body?.product?.id;

    if (!productId) {
      return res.status(400).json({ error: 'Missing product id' });
    }

    const product = await getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await processProduct(
      product,
      { vendorRates, tagRates, sellerMapping },
      'webhook',
      eventId || undefined
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.post('/reload-rates', (_req, res) => {
  vendorRates = loadVendorRates();
  tagRates = loadTagRates();
  sellerMapping = loadSellerMapping();
  res.json({ ok: true });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    vendorRateCount: vendorRates.size,
    tagRateCount: tagRates.size,
    sellerMappingCount: sellerMapping.size,
    queuePending: webkulQueue.size,
    queueRunning: webkulQueue.pending,
  });
});

async function start() {
  await initDb();
  app.listen(config.port, () => {
    console.log(`Webkul price offset middleware listening on ${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
