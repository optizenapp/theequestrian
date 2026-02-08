import { NextResponse } from 'next/server';
import { listBrandsWithOverrides } from '@/lib/content/brand-content';
import { sql } from '@vercel/postgres';

const ensureBrandContentTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS brand_content (
      id SERIAL PRIMARY KEY,
      handle TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      h1_title TEXT,
      meta_title TEXT,
      meta_description TEXT,
      short_description TEXT,
      long_description TEXT,
      breadcrumb_label TEXT,
      faq_json TEXT,
      status TEXT DEFAULT 'published',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_content_handle ON brand_content(handle)`;
};

export async function GET() {
  try {
    await ensureBrandContentTable();
    const brands = await listBrandsWithOverrides();
    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}
