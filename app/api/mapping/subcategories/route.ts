import { NextRequest, NextResponse } from 'next/server';
import { getSubcategoriesForCollection } from '@/lib/mapping/collection-mapping';

/**
 * API Route: Get subcategories from mapping CSV
 * GET /api/mapping/subcategories?category=horse
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');

    if (!category) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      );
    }

    // Get subcategories from mapping
    const subcategories = getSubcategoriesForCollection(category, subcategory || undefined);

    return NextResponse.json({
      category,
      subcategory: subcategory || null,
      subcategories,
    });
  } catch (error) {
    console.error('Error in /api/mapping/subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}

