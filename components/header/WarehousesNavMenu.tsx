'use client';

import Link from 'next/link';
import { listWarehouses, warehouseHref } from '@/lib/warehouses/registry';

interface WarehousesNavMenuProps {
  onClose?: () => void;
}

export function WarehousesNavMenu({ onClose }: WarehousesNavMenuProps) {
  const warehouses = listWarehouses();

  return (
    <div className="w-full max-w-lg bg-surface border border-gray-100 rounded-2xl shadow-2xl overflow-hidden relative">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-1">Ship from</p>
            <h3 className="text-lg font-semibold text-gray-900">Our warehouses</h3>
          </div>
          <Link
            href="/warehouses"
            className="text-sm font-semibold text-action hover:underline"
            onClick={onClose}
          >
            View all →
          </Link>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {warehouses.map((wh) => (
            <li key={wh.slug}>
              <Link
                href={warehouseHref(wh.slug)}
                onClick={onClose}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 hover:text-action transition"
              >
                {wh.displayName}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
