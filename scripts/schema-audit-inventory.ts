#!/usr/bin/env tsx
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { SCHEMA_CONTRACTS, type SchemaContract } from '../lib/schema/contracts';

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_MD = path.join(ROOT, 'docs', 'SCHEMA-AUDIT-INVENTORY.md');
const OUTPUT_JSON = path.join(ROOT, 'exports', 'schema-audit-inventory.json');

interface ContractResult {
  contract: SchemaContract;
  hasJsonLdScript: boolean;
  missingRequired: string[];
  missingRecommended: string[];
}

async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

function toAbsoluteImport(importPath: string): string | null {
  if (!importPath.startsWith('@/')) {
    return null;
  }

  const localPath = path.join(ROOT, importPath.replace('@/', ''));
  const candidates = [
    localPath,
    `${localPath}.ts`,
    `${localPath}.tsx`,
    path.join(localPath, 'index.ts'),
    path.join(localPath, 'index.tsx'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function collectImports(content: string): string[] {
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match = importRegex.exec(content);
  while (match) {
    imports.push(match[1]);
    match = importRegex.exec(content);
  }
  return imports;
}

async function loadSchemaContext(templatePath: string): Promise<string> {
  const absoluteTemplatePath = path.join(ROOT, templatePath);
  const templateContent = await readFileSafe(absoluteTemplatePath);
  const imports = collectImports(templateContent);
  const schemaRelatedImports = imports.filter((importPath) => importPath.includes('schema') || importPath.includes('breadcrumb'));

  let context = templateContent;
  for (const importPath of schemaRelatedImports) {
    const absoluteImportPath = toAbsoluteImport(importPath);
    if (!absoluteImportPath) {
      continue;
    }

    const importContent = await readFileSafe(absoluteImportPath);
    context += `\n${importContent}`;
  }

  return context;
}

function hasType(context: string, typeName: string): boolean {
  return new RegExp(`["']@type["']\\s*:\\s*["']${typeName}["']`).test(context) || context.includes(typeName);
}

async function evaluateContract(contract: SchemaContract): Promise<ContractResult> {
  const context = await loadSchemaContext(contract.templatePath);
  const missingRequired = contract.requiredTypes.filter((typeName) => !hasType(context, typeName));
  const missingRecommended = contract.recommendedTypes.filter((typeName) => !hasType(context, typeName));
  const hasJsonLdScript = /application\/ld\+json/.test(context);

  return {
    contract,
    hasJsonLdScript,
    missingRequired,
    missingRecommended,
  };
}

function buildMarkdown(results: ContractResult[]): string {
  const now = new Date().toISOString();
  const rows = results
    .map(({ contract, hasJsonLdScript, missingRequired, missingRecommended }) => {
      const status = missingRequired.length === 0 ? 'PASS' : 'FAIL';
      return `| ${contract.pageType} | \`${contract.templatePath}\` | ${status} | ${hasJsonLdScript ? 'Yes' : 'No'} | ${missingRequired.length === 0 ? 'None' : missingRequired.join(', ')} | ${missingRecommended.length === 0 ? 'None' : missingRecommended.join(', ')} | ${contract.sampleUrls.join('<br/>')} |`;
    })
    .join('\n');

  return `# Schema Audit Inventory

Generated: ${now}

## Contract Coverage Matrix

| Page Type | Template | Required Contract | JSON-LD Present | Missing Required Types | Missing Recommended Types | Sample URLs |
|---|---|---|---|---|---|---|
${rows}

## Severity Rules

- \`critical\`: Product schema missing from any product-rendering route.
- \`high\`: Collection/home/FAQ contract missing required schema types.
- \`medium\`: About/contact/news index/author contract gaps.
- \`low\`: Policy page baseline schema gaps.
`;
}

async function main() {
  const results = await Promise.all(SCHEMA_CONTRACTS.map((contract) => evaluateContract(contract)));
  const markdown = buildMarkdown(results);

  await fs.mkdir(path.dirname(OUTPUT_MD), { recursive: true });
  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await fs.writeFile(OUTPUT_MD, markdown, 'utf8');
  await fs.writeFile(
    OUTPUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2
    ),
    'utf8'
  );

  const failed = results.filter((result) => result.missingRequired.length > 0);
  console.log(`Schema inventory generated: ${results.length} contracts checked, ${failed.length} failing contracts.`);
}

main().catch((error) => {
  console.error('Failed to run schema inventory audit:', error);
  process.exit(1);
});
