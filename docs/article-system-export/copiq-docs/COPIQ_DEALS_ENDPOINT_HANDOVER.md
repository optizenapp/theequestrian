# Yorkshire.com Deals API — Copiq Integration Handover

**Date:** 2 March 2026  
**Status:** ✅ Live on dev — ready for integration testing  
**Base URL:** `https://www.yorkshire.com`

---

## What's Changed From the Original Contract

Before integrating, please note the following differences from the original API contract:

| Original Contract | Actual Implementation |
|---|---|
| Endpoint: `/api/copiq/search` | Endpoint: **`/api/copiq/deals`** (search is taken by a different endpoint) |
| `price` field | **`voucher_code`** field instead — we don't store prices for affiliate deals |
| `rating` field | Always **`null`** — not available |
| `best_for` field | Always **`null`** — not available |
| `includes` field | **Not returned** — not available |
| Sort: `price_asc`, `rating_desc` | Not supported — use `expiry_asc` or `discount_desc` |
| Accommodation category: `accommodation` | Category slug is **`stay`** |

---

## Endpoint

```
GET /api/copiq/deals
Authorization: Bearer {api_key}
```

Data source: same promotions that power [yorkshire.com/deals](https://www.yorkshire.com/deals) — ~5,400 active UK deals.

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | — | Keyword search across deal title, description, and provider name |
| `category` | string | All | Filter by category slug (see below) |
| `min_discount` | integer | — | Only return deals where discount % ≥ this value |
| `sort` | enum | `expiry_asc` | `expiry_asc` or `discount_desc` |
| `limit` | integer | 10 | Max results (1–50) |
| `status` | string | `active` | Pass `all` to include non-active deals |

---

## Category Slugs

| Display Label (on site) | API `category` value |
|---|---|
| General | `general` |
| Travel | `travel` |
| Automotive | `automotive` |
| Fashion | `fashion` |
| Technology | `technology` |
| Gifts | `gifts` |
| Accommodation | `stay` |
| Health | `health` |
| Sport & Leisure | `sport-leisure` |
| Home & Garden | `home-garden` |
| Education | `education` |
| Entertainment | `entertainment` |
| Beauty & Health | `beauty` |
| Kids & Baby | `kids` |
| Food & Drink | `food-drink` |

---

## Response Format

```json
{
  "success": true,
  "data": [ ... ],
  "total": 669,
  "deals_table": "| Rank | Deal | Provider | Voucher Code | Saving | Valid Until |\n..."
}
```

### Deal Object

```json
{
  "id": "3f8a1c2d-...",
  "name": "30% off RRP on selected Endura cycling products",
  "provider": "Endura",
  "currency": "GBP",
  "voucher_code": "ENDURA30",
  "discount_percent": 30,
  "description": "30% off RRP on selected products",
  "terms": "Subject to availability. While stocks last.",
  "affiliate_url": "https://www.yorkshire.com/go/endura-30off",
  "valid_until": "2026-06-30T23:59:59.000Z",
  "category": "sport-leisure",
  "rating": null,
  "best_for": null
}
```

### Field Reference

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable UUID — use for deduplication |
| `name` | string | Deal title as shown on yorkshire.com/deals |
| `provider` | string | Brand or advertiser name |
| `currency` | string | Always `"GBP"` |
| `voucher_code` | string \| null | Code to apply at checkout — present on ~57% of deals |
| `discount_percent` | integer \| null | Extracted from title where stated (e.g. "30% off" → `30`) |
| `description` | string \| null | Deal description — present on ~99% of deals |
| `terms` | string \| null | T&Cs — present on ~66% of deals |
| `affiliate_url` | string | Tracked affiliate link — always present |
| `valid_until` | string \| null | ISO 8601 expiry; `null` = ongoing |
| `category` | string \| null | Category slug (see table above) |
| `rating` | null | Not available |
| `best_for` | null | Not available |

### `deals_table` Field

A preformatted markdown table ready for direct injection into an AI prompt. Columns: Rank, Deal, Provider, Voucher Code, Saving, Valid Until. Use this if you want to pass deal data to an LLM without manual formatting.

---

## Example Requests

```bash
# Travel deals, expiring soonest first
curl "https://www.yorkshire.com/api/copiq/deals?category=travel&sort=expiry_asc&limit=10" \
  -H "Authorization: Bearer {api_key}"

# Best voucher codes across all categories
curl "https://www.yorkshire.com/api/copiq/deals?sort=discount_desc&limit=20" \
  -H "Authorization: Bearer {api_key}"

# Food & drink deals with at least 15% off
curl "https://www.yorkshire.com/api/copiq/deals?category=food-drink&min_discount=15" \
  -H "Authorization: Bearer {api_key}"

# Keyword search — "hotel" deals
curl "https://www.yorkshire.com/api/copiq/deals?q=hotel&category=stay&limit=10" \
  -H "Authorization: Bearer {api_key}"
```

---

## Example Response

```json
{
  "success": true,
  "data": [
    {
      "id": "38b40ef7-44c3-49c5-b924-c408d0ec503d",
      "name": "St. John's Day Offer — Htop Hotels",
      "provider": "Htop Hotels",
      "currency": "GBP",
      "voucher_code": null,
      "discount_percent": null,
      "description": "Special summer rates at Htop Hotels across Spain and the Balearics.",
      "terms": "Subject to availability. Not valid on bank holidays.",
      "affiliate_url": "https://www.yorkshire.com/go/htop-stjohns",
      "valid_until": "2026-06-28T23:59:59.000Z",
      "category": "travel",
      "rating": null,
      "best_for": null
    }
  ],
  "total": 669,
  "deals_table": "| Rank | Deal | Provider | Voucher Code | Saving | Valid Until |\n|---|---|---|---|---|---|\n| 1 | St. John's Day Offer — Htop Hotels | Htop Hotels | - | - | 28 Jun 2026 |"
}
```

---

## Error Responses

| HTTP Status | `code` | Cause |
|---|---|---|
| `401` | `UNAUTHORIZED` | Missing or invalid API key |
| `400` | `VALIDATION_ERROR` | Invalid `category` value passed |
| `500` | `INTERNAL_ERROR` | Server-side failure |

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid category 'accommodation'. Valid values: general, travel, automotive, ..."
}
```

---

## Data Notes

- All deals are scoped to **UK-only** promotions (`is_uk = true`) — same filter as the public /deals page
- `discount_percent` is **extracted from the deal title** using regex (`/(\d+)%\s*off/i`) — it is not a stored field. If the title doesn't state a percentage, this will be `null`
- `min_discount` filtering works only on deals where `discount_percent` is non-null
- Deal volume by category (approximate, live counts vary):
  - General: ~3,657 · Travel: ~669 · Automotive: ~619 · Fashion: ~472 · Technology: ~261
  - Gifts: ~181 · Accommodation (stay): ~105 · Health: ~101 · Sport & Leisure: ~94
  - Home & Garden: ~87 · Education: ~56 · Entertainment: ~37 · Beauty: ~36 · Kids: ~27 · Food & Drink: ~8

---

*For integration questions contact the Yorkshire.com technical team.*
