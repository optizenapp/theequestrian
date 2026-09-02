import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

async function ensureClassificationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS ai_product_classifications (
      id SERIAL PRIMARY KEY,
      shopify_id TEXT NOT NULL UNIQUE,
      handle TEXT NOT NULL,
      title TEXT NOT NULL,
      vendor TEXT,
      current_type TEXT,
      suggested_type TEXT,
      confidence INTEGER NOT NULL,
      openai_type TEXT NOT NULL,
      openai_confidence INTEGER NOT NULL,
      claude_type TEXT,
      claude_confidence INTEGER,
      both_agree BOOLEAN DEFAULT FALSE,
      needs_review BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Add index on status for filtering
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ai_classifications_status 
    ON ai_product_classifications(status)
  `;

  await sql`
    ALTER TABLE ai_product_classifications
    ALTER COLUMN suggested_type DROP NOT NULL
  `;
}

export async function GET() {
  try {
    await ensureClassificationsTable();

    const result = await sql`
      SELECT 
        shopify_id,
        handle,
        title,
        vendor,
        current_type,
        suggested_type,
        confidence,
        openai_type,
        openai_confidence,
        claude_type,
        claude_confidence,
        both_agree,
        needs_review,
        status,
        created_at,
        updated_at
      FROM ai_product_classifications
      ORDER BY 
        CASE status
          WHEN 'pending' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'applied' THEN 3
          WHEN 'rejected' THEN 4
        END,
        needs_review DESC,
        confidence DESC
    `;

    return NextResponse.json({ classifications: result.rows });
  } catch (error) {
    console.error('Error fetching classifications:', error);
    return NextResponse.json({ error: 'Failed to fetch classifications' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureClassificationsTable();

    const body = await request.json();
    const {
      shopify_id,
      handle,
      title,
      vendor,
      current_type,
      suggested_type,
      confidence,
      openai_type,
      openai_confidence,
      claude_type,
      claude_confidence,
      both_agree,
      needs_review,
    } = body;

    await sql`
      INSERT INTO ai_product_classifications (
        shopify_id,
        handle,
        title,
        vendor,
        current_type,
        suggested_type,
        confidence,
        openai_type,
        openai_confidence,
        claude_type,
        claude_confidence,
        both_agree,
        needs_review,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${shopify_id},
        ${handle},
        ${title},
        ${vendor || null},
        ${current_type || null},
        ${suggested_type},
        ${confidence},
        ${openai_type},
        ${openai_confidence},
        ${claude_type || null},
        ${claude_confidence || null},
        ${both_agree || false},
        ${needs_review || false},
        'pending',
        NOW(),
        NOW()
      )
      ON CONFLICT (shopify_id) DO UPDATE
      SET
        handle = EXCLUDED.handle,
        title = EXCLUDED.title,
        vendor = EXCLUDED.vendor,
        current_type = EXCLUDED.current_type,
        suggested_type = EXCLUDED.suggested_type,
        confidence = EXCLUDED.confidence,
        openai_type = EXCLUDED.openai_type,
        openai_confidence = EXCLUDED.openai_confidence,
        claude_type = EXCLUDED.claude_type,
        claude_confidence = EXCLUDED.claude_confidence,
        both_agree = EXCLUDED.both_agree,
        needs_review = EXCLUDED.needs_review,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving classification:', error);
    return NextResponse.json({ error: 'Failed to save classification' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { shopify_id, status, manual_override } = body;

    if (!shopify_id || !status) {
      return NextResponse.json({ error: 'Missing shopify_id or status' }, { status: 400 });
    }

    // If manual override is provided, update the suggested_type as well
    if (manual_override) {
      await sql`
        UPDATE ai_product_classifications
        SET 
          status = ${status}, 
          suggested_type = ${manual_override},
          updated_at = NOW()
        WHERE shopify_id = ${shopify_id}
      `;
    } else {
      await sql`
        UPDATE ai_product_classifications
        SET status = ${status}, updated_at = NOW()
        WHERE shopify_id = ${shopify_id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating classification:', error);
    return NextResponse.json({ error: 'Failed to update classification' }, { status: 500 });
  }
}
