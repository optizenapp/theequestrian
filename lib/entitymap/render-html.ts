import { getCanonicalSiteUrl } from '@/lib/seo/site-url';
import type { EntityMapDocument } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderEntityMapHtml(doc: EntityMapDocument): string {
  const base = getCanonicalSiteUrl();
  const entitySections = doc.entities
    .map((entity) => {
      const relations = (entity.relations ?? [])
        .map((rel) => `<li><code>${escapeHtml(rel.predicate)}</code> → ${escapeHtml(rel.targetName)}</li>`)
        .join('');
      const chunks = entity.hasChunks
        .map(
          (c) => `<blockquote cite="${escapeHtml(c.sourceUrl)}">
<p>${escapeHtml(c.text)}</p>
<p><a href="${escapeHtml(c.sourceUrl)}">${escapeHtml(c.pageTitle)}</a> · ${escapeHtml(c.publisher)}</p>
</blockquote>`
        )
        .join('\n');

      return `<section id="${escapeHtml(entity.entityId)}">
<h2>${escapeHtml(entity.name)} <small>(${escapeHtml(entity['@type'])})</small></h2>
<p>${escapeHtml(entity.description)}</p>
${relations ? `<ul>${relations}</ul>` : ''}
${chunks}
</section>`;
    })
    .join('\n');

  const jsonLd = JSON.stringify(doc);

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EntityMap — ${escapeHtml(doc.publisher.name)}</title>
<meta name="description" content="Structured entity index for ${escapeHtml(doc.publisher.name)} — entities, relationships, and attributed evidence for AI systems.">
<link rel="canonical" href="${base}/entitymap.html">
<script type="application/ld+json">${jsonLd}</script>
<style>
body{font-family:system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a1a1a}
h1{font-size:1.5rem}h2{font-size:1.15rem;margin-top:2rem;border-top:1px solid #e5e5e5;padding-top:1rem}
small{font-weight:normal;color:#666}blockquote{margin:1rem 0;padding:.75rem 1rem;background:#f7f7f7;border-left:3px solid #00B2A9}
a{color:#007a74}header,footer{color:#555;font-size:.9rem}
</style>
</head>
<body>
<header>
<p><strong>EntityMap v${escapeHtml(doc.version)}</strong> · Publisher: <a href="${escapeHtml(doc.publisher.url)}">${escapeHtml(doc.publisher.name)}</a></p>
<p>Generated: ${escapeHtml(doc.generated)} · Status: ${escapeHtml(doc.verificationStatus)}</p>
<p>Machine-readable: <a href="${base}/entitymap.json">entitymap.json</a></p>
</header>
<main>
<h1>EntityMap for ${escapeHtml(doc.publisher.name)}</h1>
<p>Structured index of what this site knows — entities, relationships, and source-attributed evidence chunks for AI retrieval systems.</p>
${entitySections}
</main>
<footer>
<p>Specification: <a href="https://entitymap.org/spec/v1.0">entitymap.org/spec/v1.0</a></p>
</footer>
</body>
</html>`;
}
