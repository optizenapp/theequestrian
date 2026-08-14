'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CategorySiloNav, SiloLink } from '@/lib/nav/category-silo';

function isCurrent(path: string, currentPath: string): boolean {
  return path === currentPath;
}

function isInBranch(path: string, currentPath: string): boolean {
  return currentPath === path || currentPath.startsWith(`${path}/`);
}

function linkClass(active: boolean): string {
  return active
    ? 'text-primary font-semibold'
    : 'text-gray-700 hover:text-gray-900';
}

function Branch({
  branch,
  currentPath,
}: {
  branch: SiloLink;
  currentPath: string;
}) {
  const active = isCurrent(branch.path, currentPath);
  const [expanded, setExpanded] = useState(() => isInBranch(branch.path, currentPath));

  if (branch.children.length === 0) {
    return (
      <Link href={branch.path} className={`block py-1 text-sm ${linkClass(active)}`}>
        {branch.label}
      </Link>
    );
  }

  return (
    <details
      open={expanded}
      className="group"
      onToggle={(event) => {
        setExpanded((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-sm [&::-webkit-details-marker]:hidden">
        <span className="text-gray-400 group-open:rotate-90 transition-transform" aria-hidden>
          ▸
        </span>
        <Link
          href={branch.path}
          className={`flex-1 ${linkClass(active)}`}
          onClick={(event) => event.stopPropagation()}
        >
          {branch.label}
        </Link>
      </summary>
      <ul className="ml-4 border-l border-gray-200 pl-3">
        {branch.children.map((child) => (
          <li key={child.path}>
            <Link
              href={child.path}
              className={`block py-1 text-sm ${linkClass(isCurrent(child.path, currentPath))}`}
            >
              {child.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function CategorySiloNav({ nav }: { nav: CategorySiloNav }) {
  return (
    <nav className="border-b border-gray-200 pb-6" aria-label="Categories">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
      <ul className="space-y-1">
        {nav.tops.map((top) => {
          const handle = top.path.slice(1);
          const isSilo = nav.currentTopHandle === handle;
          return (
            <li key={top.path}>
              <Link
                href={top.path}
                className={`block py-1 text-sm ${linkClass(isCurrent(top.path, nav.currentPath))}`}
              >
                {top.label}
              </Link>
              {isSilo && nav.branches.length > 0 && (
                <div className="ml-3 mt-1 space-y-0.5">
                  {nav.branches.map((branch) => (
                    <Branch key={branch.path} branch={branch} currentPath={nav.currentPath} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
