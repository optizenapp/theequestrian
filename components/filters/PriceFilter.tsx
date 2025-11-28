'use client';

/**
 * Price Filter Component
 * 
 * Dual-handle range slider for price filtering
 * Fixed range: $0 - $500
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PriceFilterProps {
  min: number;
  max: number;
  currencyCode?: string;
}

