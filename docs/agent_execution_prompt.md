# Internal Link Cleanup Agent Execution Prompt

## Objective
Eliminate all internal links pointing to redirects (3xx) or broken URLs (4xx) and replace them with direct canonical URLs.

---

## Rules

1. Do NOT guess replacements for 4xx URLs if no recommended URL exists.
2. Replace all 3xx links with provided recommended URLs.
3. Prioritise:
   - P1 → P2 → P3
4. Fix in order:
   - footer → header → nav → templates → content
5. Fix source generators (components/helpers) before individual pages.
6. Work in batches and log all changes.

---

## Files

- redirect_agent_action_summary.csv (priority + grouping)
- redirect_agent_fix_detail.csv (row-level detail)

---

## Phase 1 — Template Fixes

- Filter: P1 + 3xx
- Focus: footer, header, nav, templates

Steps:
1. Find bad URL
2. Replace with recommended URL
3. Fix helper/component if repeated

---

## Phase 2 — Content Fixes

- Filter: P1/P2 + 3xx + content

Steps:
1. Find in CMS/blog/content
2. Replace old URL with new
3. Preserve formatting

---

## Phase 3 — 4xx Handling

- If recommended URL exists → replace
- If not → mark for manual review

---

## Search Patterns

Search for:
- relative paths
- absolute URLs
- trailing slash variants

---

## Special Case

/products → fix immediately (likely footer/nav)

---

## Validation

After each batch:
- test links resolve 200
- no redirects triggered
- no broken links introduced

---

## Output Required

1. Fixed URLs (old → new)
2. Files changed
3. Unresolved issues
4. Risks

---

## Done When

- No internal links rely on redirects
- All templates use canonical URLs
- 4xx issues resolved or flagged

---

## Principle

If a user clicks a link and hits a redirect → it is wrong.
