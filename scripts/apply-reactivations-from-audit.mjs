#!/usr/bin/env node
import fs from 'node:fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const shop = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API = '2025-01';

if (!shop || !token) {
  throw new Error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readIds(csvPath) {
  const txt = fs.readFileSync(csvPath, 'utf8').trim();
  if (!txt) return [];
  return txt
    .split('\n')
    .slice(1)
    .map((line) => (line.match(/^"?(\d+)"?,/) || [])[1])
    .filter(Boolean);
}

function readLineIds(path) {
  if (!fs.existsSync(path)) return [];
  const txt = fs.readFileSync(path, 'utf8').trim();
  if (!txt) return [];
  return txt.split('\n').map((x) => x.trim()).filter(Boolean);
}

async function call(path, init) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    const res = await fetch(`https://${shop}/admin/api/${API}${path}`, {
      ...init,
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(
        retryAfter > 0 ? retryAfter * 1000 : Math.min(45_000, 2_500 * 2 ** Math.min(attempt - 1, 4))
      );
      continue;
    }

    if (res.status >= 500 && attempt < 20) {
      await sleep(Math.min(30_000, 2_000 * 2 ** Math.min(attempt - 1, 4)));
      continue;
    }

    return res;
  }
  return null;
}

const remaining = readLineIds('audit-remaining-activate.txt');
const ids = remaining.length > 0 ? remaining : readIds('audit-should-be-active-but-draft.csv');
const failed = [];
let ok = 0;

for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  const res = await call(`/products/${id}.json`, {
    method: 'PUT',
    body: JSON.stringify({ product: { id: Number(id), status: 'active' } }),
  });

  if (!res || !res.ok) {
    const errorText = !res ? 'retry_exhausted' : `${res.status} ${(await res.text()).slice(0, 200)}`;
    failed.push(`${id}:${errorText}`);
  } else {
    ok += 1;
  }

  if ((i + 1) % 20 === 0 || i + 1 === ids.length) {
    console.log(`activate progress ${i + 1}/${ids.length} ok=${ok} fail=${failed.length}`);
  }
  await sleep(1200);
}

fs.writeFileSync('audit-reactivation-failed.txt', failed.join('\n'));
console.log(`done reactivated_ok=${ok} reactivated_failed=${failed.length}`);
