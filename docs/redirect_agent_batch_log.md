# Redirect agent batch log

Execution of [agent_execution_prompt.md](agent_execution_prompt.md) using [redirect_agent_fix_detail.csv](redirect_agent_fix_detail.csv) and [redirect_agent_action_summary.csv](redirect_agent_action_summary.csv).

## Phase 1 — Templates (footer / nav)

| old_path | new_path | Files | CSV rows addressed (approx) |
|----------|----------|-------|----------------------------|
| `/products` | `/horse/grooming/products` | [components/footer/Footer.tsx](../components/footer/Footer.tsx) (`All Products` link) | ~6020 footer inlinks in fix_detail |

**Template/nav scan:** Parsed `fix_detail` for `Link Position` / `source_class` in footer, header, nav, template_or_listing with `issue_type=3xx` and non-empty `old_path`/`new_path`. Only distinct pair was `/products` → `/horse/grooming/products` (footer). No other hardcoded matches in [components/](components/) for additional pairs.

**Note:** “All Products” now points at the same URL the site was already redirecting `/products` to (per crawl). If you prefer a different catalog root (e.g. search), change `Footer.tsx` and align redirects.

## Phase 2 — In-repo content

| Change | File |
|--------|------|
| Replaced legacy `https://www.theequestrian.com.au/collections/{brand}` links with `.../brands/{brand}` for Kentucky, Equipe, Prestige, PS of Sweden, Ariat, Cavalleria Toscana, BARE Equestrian | [exports/home-sections.csv](../exports/home-sections.csv) (`rich_text_brands` rich text section) |

**Production:** [lib/content/home.ts](../lib/content/home.ts) loads **`home_sections` from the database first** when rows exist; CSV is fallback. If production homepage still shows old links, update `body_html` for key `rich_text_brands` in Neon to match the CSV substitutions (or re-import from CSV).

**Out of repo:** Article/blog HTML under `/news/...` remains in Shopify or your article pipeline. Filter `redirect_agent_fix_detail.csv` where `source_path` starts with `/news` (or `Source` contains `/news/`) to list article pages that still link to 3xx destinations; fix anchors in the CMS.

## Phase 3 — Unresolved

- Generated [redirect_agent_unresolved.md](redirect_agent_unresolved.md): **128** summary rows with empty `recommended_url` (mix of 3xx needing final URL resolution and 4xx).
- No automatic replacements applied for those rows (per prompt: do not guess).

## Validation

- Run `npm run build` after changes.
- Spot-check: homepage brand paragraph links; footer “All Products”.
- Re-run Screaming Frog when convenient to confirm drop in internal 3xx to `/products` and `/collections/...` from home.

## Risks

- `/horse/grooming/products` as the “All Products” label may be semantically narrow; confirm with merchandising.
- DB-backed `home_sections` can override CSV until updated.
