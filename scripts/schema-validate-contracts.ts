#!/usr/bin/env tsx
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { SCHEMA_CONTRACTS, type SchemaSeverity } from '../lib/schema/contracts';

const ROOT = path.resolve(__dirname, '..');

interface ValidationIssue {
  severity: SchemaSeverity;
  templatePath: string;
  pageType: string;
  message: string;
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
  const templateContent = await readFileSafe(path.join(ROOT, templatePath));
  const imports = collectImports(templateContent);
  const schemaRelatedImports = imports.filter((importPath) => importPath.includes('schema') || importPath.includes('breadcrumb'));

  let context = templateContent;
  for (const importPath of schemaRelatedImports) {
    const absoluteImportPath = toAbsoluteImport(importPath);
    if (!absoluteImportPath) {
      continue;
    }
    context += `\n${await readFileSafe(absoluteImportPath)}`;
  }
  return context;
}

function typeExists(content: string, typeName: string): boolean {
  return new RegExp(`["']@type["']\\s*:\\s*["']${typeName}["']`).test(content) || content.includes(typeName);
}

async function validateContracts() {
  const issues: ValidationIssue[] = [];

  for (const contract of SCHEMA_CONTRACTS) {
    const context = await loadSchemaContext(contract.templatePath);
    const templateContent = await readFileSafe(path.join(ROOT, contract.templatePath));
    const hasScriptTag = context.includes('application/ld+json');
    if (!hasScriptTag) {
      issues.push({
        severity: contract.missingSeverity,
        templatePath: contract.templatePath,
        pageType: contract.pageType,
        message: 'Template has no JSON-LD script tag.',
      });
    }

    const missingRequired = contract.requiredTypes.filter((typeName) => !typeExists(context, typeName));
    if (missingRequired.length > 0) {
      issues.push({
        severity: contract.missingSeverity,
        templatePath: contract.templatePath,
        pageType: contract.pageType,
        message: `Missing required schema types: ${missingRequired.join(', ')}`,
      });
    }
  }

  return issues;
}

function printIssues(issues: ValidationIssue[]) {
  if (issues.length === 0) {
    console.log('Schema contract validation passed. No issues found.');
    return;
  }

  console.log(`Schema contract validation found ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.log(`[${issue.severity.toUpperCase()}] ${issue.templatePath} (${issue.pageType}) - ${issue.message}`);
  }
}

async function main() {
  const issues = await validateContracts();
  printIssues(issues);

  const shouldFail = issues.some((issue) => issue.severity === 'critical' || issue.severity === 'high');
  if (shouldFail) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Failed to validate schema contracts:', error);
  process.exit(1);
});
