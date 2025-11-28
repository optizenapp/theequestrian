'use client';

/**
 * Filter Chips Component
 * 
 * Displays active filters as removable chips above the product grid
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { SubcategoryOption } from '@/lib/filters/category-filter';

interface FilterChipsProps {
  currentSubcategory?: SubcategoryOption;
  onClearAll: () => void;
}

