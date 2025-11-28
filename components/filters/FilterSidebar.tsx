'use client';

/**
 * Filter Sidebar Component
 * 
 * Main container for all filters
 * Responsive: sidebar on desktop, bottom drawer on mobile
 */

import { useState, useEffect } from 'react';
import { CategoryFilter } from './CategoryFilter';
import { PriceFilter } from './PriceFilter';
import { AttributeFilter } from './AttributeFilter';
import type { SubcategoryOption } from '@/lib/filters/category-filter';
import type { FilterOption } from '@/lib/filters/product-filters';

interface FilterSidebarProps {
  // Category filter props
  subcategories: SubcategoryOption[];
  currentCategory: string;
  currentSubcategory?: string;
  parentCollectionTitle: string;

  // Attribute filter options
  sizeOptions: FilterOption[];
  colorOptions: FilterOption[];
  brandOptions: FilterOption[];

  // Price range
  priceMin?: number;
  priceMax?: number;
  currencyCode?: string;

  // Mobile drawer state
  isOpen?: boolean;
  onClose?: () => void;
}

