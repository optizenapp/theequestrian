'use client';

/**
 * Product Grid With Filters Component
 * 
 * Client component that handles product filtering based on URL params
 * and displays filtered products
 */

import { useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { applyFilters } from '@/lib/filters/product-filters';
import {
  getSizeOptions,
  getColorOptions,
  getBrandOptions,
  getPriceRange,
} from '@/lib/filters/product-filters';
import {
  getFilterPreferences,
  saveFilterPreferences,
  clearFilterPreferences,
  getFiltersFromSearchParams,
} from '@/lib/filters/localStorage';
import { FilterChips } from './FilterChips';
import { FilterButton } from './FilterButton';
import { FilterSidebar } from './FilterSidebar';
import type { ShopifyProduct } from '@/types/shopify';
import type { SubcategoryOption } from '@/lib/filters/category-filter';
import type { FilterOption } from '@/lib/filters/product-filters';

interface ProductGridWithFiltersProps {
  products: ShopifyProduct[];
  subcategories: SubcategoryOption[];
  currentCategory: string;
  currentSubcategory?: string;
  parentCollectionTitle: string;
}

