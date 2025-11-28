'use client';

/**
 * Category Filter Component
 * 
 * Displays subcategories (product types) as SEO-friendly links
 * Grouped by parent collection in accordion format
 * Includes search functionality
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { SubcategoryOption } from '@/lib/filters/category-filter';

interface CategoryFilterProps {
  subcategories: SubcategoryOption[];
  currentCategory: string;
  currentSubcategory?: string;
  parentCollectionTitle: string;
}

