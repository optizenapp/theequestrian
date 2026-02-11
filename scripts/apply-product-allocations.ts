/**
 * Apply Product Category Allocations
 * 
 * Allocates products to their classified 3-level categories with:
 * - Canonical URL management (deepest hop)
 * - Parent category assignments
 * - Brand page assignments
 * - 301 redirect generation for URL changes
 * - Dry-run mode for preview
 */

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import * as fs from 'fs';
import * as path from 'path';
import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

interface ClassificationRow {
  shopify_id: string;
  handle: string;
  title: string;
  vendor: string;
  current_type: string;
  suggested_type: string;
  confidence: string;
  validation_status: string;
  reasoning: string;
  alternative_types: string;
  cat_title: string;
  cat_slug: string;
  current_canonical_url: string;
  proposed_canonical_url: string;
  redirect_required: string;
  redirect_from: string;
  redirect_to: string;
  tags: string;
  collections: string;
  model_used: string;
  vision_escalated: string;
  suggested_brand_handles: string;
}

interface AllocationPreview {
  shopify_id: string;
  handle: string;
  title: string;
  old_canonical: string;
  new_canonical: string;
  redirect_required: boolean;
  redirect_from: string;
  redirect_to: string;
  category_path: string;
  parent_categories: string[];
  brand_pages: string[];
  status: 'success' | 'skipped' | 'error';
  error_message?: string;
}

interface ProductAssignment {
  product_id: string;
  product_handle: string;
  canonical_path: string;
  category_path: string;
  top_level: string;
  parent_category: string | null;
  subcategory_handle: string | null;
}

interface RedirectEntry {
  from_path: string;
  to_path: string;
  type: number;
}

async function applyProductAllocations() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const exportPreview = args.includes('--export-preview');
  const branch = args.find(arg => arg.startsWith('--branch='))?.split('=')[1] || 'main';

  console.log('🚀 Product Category Allocation\n');
  console.log(`Mode: ${dryRun ? '🧪 DRY RUN (no database writes)' : '🔴 LIVE MODE (will modify database)'}`);
  console.log(`Branch: ${branch}\n`);

  if (!dryRun) {
    console.log('⚠️  WARNING: This will modify the database!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Read classification CSV
  const csvFile = path.join(process.cwd(), 'exports', 'ai-classified-products-gpt-4o-2026-02-10-FINAL.csv');
  console.log(`📖 Reading classifications: ${path.basename(csvFile)}`);
  const csvContent = fs.readFileSync(csvFile, 'utf-8');
  const classifications = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }) as ClassificationRow[];
  console.log(`   ✓ Loaded ${classifications.length} products\n`);

  // Fetch valid categories
  console.log('🗄️  Fetching category structure...');
  const { rows: categories } = await sql`
    SELECT url_path, h1_title, category_level, parent_url
    FROM collection_content
    WHERE status = 'published'
    ORDER BY category_level, url_path
  `;
  console.log(`   ✓ Loaded ${categories.length} categories\n`);

  const validCategories = new Set(categories.map(c => c.url_path));
  const categoryParents = new Map(categories.map(c => [c.url_path, c.parent_url]));

  // Process allocations
  const previews: AllocationPreview[] = [];
  const assignments: ProductAssignment[] = [];
  const redirects: RedirectEntry[] = [];
  
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log('🔄 Processing product allocations...\n');

  for (const row of classifications) {
    try {
      // Skip if missing cat_slug
      if (!row.cat_slug || row.cat_slug.trim() === '') {
        skippedCount++;
        previews.push({
          shopify_id: row.shopify_id,
          handle: row.handle,
          title: row.title,
          old_canonical: row.current_canonical_url,
          new_canonical: '',
          redirect_required: false,
          redirect_from: '',
          redirect_to: '',
          category_path: '',
          parent_categories: [],
          brand_pages: [],
          status: 'skipped',
          error_message: 'Missing cat_slug',
        });
        continue;
      }

      // Skip if invalid category
      if (!validCategories.has(row.cat_slug)) {
        skippedCount++;
        previews.push({
          shopify_id: row.shopify_id,
          handle: row.handle,
          title: row.title,
          old_canonical: row.current_canonical_url,
          new_canonical: '',
          redirect_required: false,
          redirect_from: '',
          redirect_to: '',
          category_path: row.cat_slug,
          parent_categories: [],
          brand_pages: [],
          status: 'skipped',
          error_message: `Invalid category: ${row.cat_slug}`,
        });
        continue;
      }

      // Build canonical URL (deepest hop)
      const newCanonical = `${row.cat_slug}/${row.handle}`;
      
      // Determine parent categories
      const parentCategories: string[] = [];
      let currentParent = categoryParents.get(row.cat_slug);
      while (currentParent) {
        parentCategories.push(currentParent);
        currentParent = categoryParents.get(currentParent);
      }

      // Parse brand handles
      const brandPages = row.suggested_brand_handles
        ? row.suggested_brand_handles.split(';').map(b => b.trim()).filter(Boolean)
        : [];

      // Check if redirect needed
      const redirectRequired = row.current_canonical_url && row.current_canonical_url !== newCanonical;
      const redirectFrom = redirectRequired ? row.current_canonical_url : '';
      const redirectTo = redirectRequired ? newCanonical : '';

      // Parse category path into components
      const categoryParts = row.cat_slug.replace(/^\//, '').split('/').filter(Boolean);
      const topLevel = categoryParts[0] || null;
      const parentCategory = categoryParts[1] || null;
      const subcategoryHandle = categoryParts[2] || null;

      // Create canonical assignment (only one per product)
      assignments.push({
        product_id: row.shopify_id,
        product_handle: row.handle,
        canonical_path: newCanonical,
        category_path: row.cat_slug,
        top_level: topLevel,
        parent_category: parentCategory,
        subcategory_handle: subcategoryHandle,
      });

      // Add redirect if needed
      if (redirectRequired) {
        redirects.push({
          from_path: redirectFrom,
          to_path: redirectTo,
          type: 301,
        });
      }

      previews.push({
        shopify_id: row.shopify_id,
        handle: row.handle,
        title: row.title,
        old_canonical: row.current_canonical_url || '',
        new_canonical: newCanonical,
        redirect_required: redirectRequired,
        redirect_from: redirectFrom,
        redirect_to: redirectTo,
        category_path: row.cat_slug,
        parent_categories: parentCategories,
        brand_pages: brandPages.map(b => `/brands/${b}`),
        status: 'success',
      });

      successCount++;

      if (successCount % 100 === 0) {
        console.log(`   ✓ Processed ${successCount} products...`);
      }
    } catch (error) {
      errorCount++;
      previews.push({
        shopify_id: row.shopify_id,
        handle: row.handle,
        title: row.title,
        old_canonical: row.current_canonical_url || '',
        new_canonical: '',
        redirect_required: false,
        redirect_from: '',
        redirect_to: '',
        category_path: row.cat_slug || '',
        parent_categories: [],
        brand_pages: [],
        status: 'error',
        error_message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(`\n📊 Processing Summary:`);
  console.log(`   • Success: ${successCount}`);
  console.log(`   • Skipped: ${skippedCount}`);
  console.log(`   • Errors: ${errorCount}`);
  console.log(`   • Total assignments: ${assignments.length}`);
  console.log(`   • Redirects needed: ${redirects.length}\n`);

  // Export preview CSV
  if (exportPreview || dryRun) {
    const previewFile = path.join(process.cwd(), 'exports', 'allocation-preview.csv');
    console.log(`💾 Exporting preview: ${path.basename(previewFile)}`);
    
    const previewCsv = stringify(previews, {
      header: true,
      columns: [
        'shopify_id',
        'handle',
        'title',
        'old_canonical',
        'new_canonical',
        'redirect_required',
        'redirect_from',
        'redirect_to',
        'category_path',
        'parent_categories',
        'brand_pages',
        'status',
        'error_message',
      ],
    });
    fs.writeFileSync(previewFile, previewCsv);
    console.log(`   ✓ Saved ${previews.length} rows\n`);
  }

  if (dryRun) {
    console.log('✅ Dry run complete! Review allocation-preview.csv before running live.\n');
    console.log('To apply changes:');
    console.log(`  npm run ai:allocate-products -- --branch=${branch}\n`);
    return;
  }

  // Apply to database
  console.log('💾 Applying allocations to database...\n');

  // Start transaction
  await sql`BEGIN`;

  try {
    // 1. Delete existing assignments for these products
    console.log('🗑️  Clearing existing assignments...');
    const productIds = Array.from(new Set(assignments.map(a => a.product_id)));
    
    for (let i = 0; i < productIds.length; i += 100) {
      const batch = productIds.slice(i, i + 100);
      await sql`
        DELETE FROM product_category_assignments
        WHERE product_id = ANY(${batch})
      `;
    }
    console.log(`   ✓ Cleared assignments for ${productIds.length} products\n`);

    // 2. Insert new assignments
    console.log('📝 Creating new assignments...');
    for (let i = 0; i < assignments.length; i += 100) {
      const batch = assignments.slice(i, i + 100);
      
      for (const assignment of batch) {
        await sql`
          INSERT INTO product_category_assignments (
            product_id,
            product_handle,
            canonical_path,
            category_path,
            top_level,
            parent_category,
            subcategory_handle,
            created_at,
            updated_at
          ) VALUES (
            ${assignment.product_id},
            ${assignment.product_handle},
            ${assignment.canonical_path},
            ${assignment.category_path},
            ${assignment.top_level},
            ${assignment.parent_category},
            ${assignment.subcategory_handle},
            NOW(),
            NOW()
          )
        `;
      }
      
      console.log(`   ✓ Inserted ${Math.min((i + 1) * 100, assignments.length)} / ${assignments.length} assignments...`);
    }
    console.log(`   ✓ Created ${assignments.length} assignments\n`);

    // 3. Insert redirects
    if (redirects.length > 0) {
      console.log('🔀 Creating redirects...');
      
      for (const redirect of redirects) {
        await sql`
          INSERT INTO manual_redirects (
            from_path,
            to_path,
            redirect_type,
            source,
            status,
            created_at,
            updated_at
          )
          VALUES (
            ${redirect.from_path},
            ${redirect.to_path},
            '301',
            'ai-classification',
            'active',
            NOW(),
            NOW()
          )
          ON CONFLICT (from_path) DO UPDATE
          SET to_path = EXCLUDED.to_path,
              redirect_type = '301',
              source = 'ai-classification',
              status = 'active',
              updated_at = NOW()
        `;
      }
      
      console.log(`   ✓ Created ${redirects.length} redirects\n`);
    }

    // Commit transaction
    await sql`COMMIT`;
    console.log('✅ Transaction committed successfully!\n');

  } catch (error) {
    // Rollback on error
    await sql`ROLLBACK`;
    console.error('❌ Error during allocation, transaction rolled back:', error);
    throw error;
  }

  console.log('✅ Allocation complete!\n');
  console.log('Next steps:');
  console.log('  1. Verify product pages render correctly');
  console.log('  2. Test redirects');
  console.log('  3. Check category pages show correct products');
  console.log('  4. Regenerate sitemap\n');
}

applyProductAllocations().catch(console.error);
