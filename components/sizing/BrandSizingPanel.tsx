'use client';

import Link from 'next/link';
import type { ResolvedBrandSizing } from '@/lib/sizing/types';
import { SizingChartZoomImage } from '@/components/sizing/SizingChartZoomImage';

interface BrandSizingPanelProps {
  sizing: ResolvedBrandSizing;
}

export function BrandSizingPanel({ sizing }: BrandSizingPanelProps) {
  const hasHtml = Boolean(sizing.sizingHtml?.trim());
  const hasCharts = sizing.charts.length > 0;
  const hasText = sizing.textCharts.length > 0;

  if (!hasHtml && !hasCharts && !hasText) {
    return (
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          Sizing for <span className="font-semibold text-gray-900">{sizing.displayName}</span> is
          coming soon. Brand sizing charts vary — if you need help choosing a size, contact us.
        </p>
        <p>
          <Link href="/sizing" className="font-semibold text-action hover:text-action-hover">
            Browse all size charts
          </Link>
          {' · '}
          <Link href="/contact" className="font-semibold text-action hover:text-action-hover">
            Contact us
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{sizing.displayName} sizing</h3>
        <p className="text-sm text-gray-600">
          Charts and measurements for this brand. Scroll to find the product type that matches yours.
        </p>
        {sizing.sourceUrl ? (
          <p className="text-xs text-gray-500 mt-2">
            Source:{' '}
            <a
              href={sizing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-action"
            >
              official brand sizing page
            </a>
          </p>
        ) : null}
      </div>

      {hasHtml ? (
        <div
          className="prose prose-sm sm:prose-base max-w-none prose-table:text-sm overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sizing.sizingHtml || '' }}
        />
      ) : null}

      {hasText
        ? sizing.textCharts.map((chart) => (
            <div key={chart.title} className="space-y-3">
              <h4 className="text-base font-semibold text-gray-900">{chart.title}</h4>
              <div
                className="prose prose-sm max-w-none overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: chart.content }}
              />
            </div>
          ))
        : null}

      {hasCharts
        ? sizing.charts.map((chart, chartIndex) => (
            <div
              key={`${chart.title}-${chartIndex}`}
              className="rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-base font-semibold text-gray-900">{chart.title}</h4>
                {chart.description ? (
                  <p className="text-sm text-gray-600 mt-0.5">{chart.description}</p>
                ) : null}
              </div>
              <div className="p-4 space-y-6">
                {chart.images.map((src, imgIndex) => (
                  <SizingChartZoomImage
                    key={`${src}-${imgIndex}`}
                    src={src}
                    alt={`${sizing.displayName} ${chart.title} chart ${imgIndex + 1}`}
                    brandName={sizing.displayName}
                    chartTitle={chart.title}
                    priority={chartIndex === 0 && imgIndex === 0}
                  />
                ))}
              </div>
            </div>
          ))
        : null}

      {sizing.sizingPagePath ? (
        <p className="text-sm text-gray-500">
          <Link
            href={sizing.sizingPagePath}
            className="font-medium text-action hover:text-action-hover"
          >
            Open full sizing page
          </Link>
        </p>
      ) : null}
    </div>
  );
}
