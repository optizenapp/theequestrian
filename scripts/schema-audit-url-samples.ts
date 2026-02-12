#!/usr/bin/env tsx
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SCHEMA_CONTRACTS, type SchemaSeverity } from '../lib/schema/contracts';

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'exports', 'schema-url-sample-audit.json');
const BASE_URL = (process.env.SCHEMA_AUDIT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003').replace(/\/+$/, '');

interface UrlAuditIssue {
  severity: SchemaSeverity;
  url: string;
  pageType: string;
  message: string;
}

interface UrlAuditResult {
  url: string;
  pageType: string;
  schemaTypes: string[];
  issues: UrlAuditIssue[];
}

function extractJsonLdBlocks(html: string): string[] {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
}

function flattenTypes(value: unknown): string[] {
  const types: string[] = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    const record = node as Record<string, unknown>;
    const atType = record['@type'];
    if (typeof atType === 'string') {
      types.push(atType);
    } else if (Array.isArray(atType)) {
      types.push(...atType.filter((entry): entry is string => typeof entry === 'string'));
    }

    for (const value of Object.values(record)) {
      visit(value);
    }
  };

  visit(value);
  return types;
}

function checkRequiredTypes(result: UrlAuditResult, requiredTypes: string[], severity: SchemaSeverity): UrlAuditIssue[] {
  const issues: UrlAuditIssue[] = [];
  for (const requiredType of requiredTypes) {
    if (!result.schemaTypes.includes(requiredType)) {
      issues.push({
        severity,
        url: result.url,
        pageType: result.pageType,
        message: `Missing required type: ${requiredType}`,
      });
    }
  }
  return issues;
}

async function auditUrl(urlPath: string, pageType: string, requiredTypes: string[], severity: SchemaSeverity): Promise<UrlAuditResult> {
  const url = `${BASE_URL}${urlPath}`;
  const issues: UrlAuditIssue[] = [];
  let html = '';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      issues.push({
        severity,
        url,
        pageType,
        message: `Request failed with HTTP ${response.status}`,
      });
    } else {
      html = await response.text();
    }
  } catch (error) {
    issues.push({
      severity,
      url,
      pageType,
      message: `Request error: ${(error as Error).message}`,
    });
  }

  const blocks = extractJsonLdBlocks(html);
  if (blocks.length === 0) {
    issues.push({
      severity,
      url,
      pageType,
      message: 'No JSON-LD blocks found in rendered HTML.',
    });
  }

  const schemaTypes: string[] = [];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block);
      schemaTypes.push(...flattenTypes(parsed));
    } catch {
      issues.push({
        severity,
        url,
        pageType,
        message: 'Invalid JSON in JSON-LD script block.',
      });
    }
  }

  const dedupedTypes = Array.from(new Set(schemaTypes));
  const result: UrlAuditResult = {
    url,
    pageType,
    schemaTypes: dedupedTypes,
    issues,
  };
  result.issues.push(...checkRequiredTypes(result, requiredTypes, severity));
  return result;
}

async function main() {
  const sampleTasks: Array<Promise<UrlAuditResult>> = [];
  for (const contract of SCHEMA_CONTRACTS) {
    const sampleUrl = contract.sampleUrls[0];
    if (!sampleUrl || sampleUrl.includes('sample-')) {
      continue;
    }
    sampleTasks.push(auditUrl(sampleUrl, contract.pageType, contract.requiredTypes, contract.missingSeverity));
  }

  const results = await Promise.all(sampleTasks);
  const issues = results.flatMap((result) => result.issues);

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        results,
        issues,
      },
      null,
      2
    ),
    'utf8'
  );

  const criticalOrHighCount = issues.filter((issue) => issue.severity === 'critical' || issue.severity === 'high').length;
  console.log(`URL sample schema audit complete. ${results.length} URLs checked, ${issues.length} issues, ${criticalOrHighCount} critical/high.`);
  if (criticalOrHighCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Failed to run URL sample schema audit:', error);
  process.exit(1);
});
