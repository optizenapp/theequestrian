interface ProductPdpValueSummaryProps {
  summaryLine: string;
  bullets?: string[];
  /** Default `full`. Use `summaryOnly` / `bulletsOnly` to split the CRO desktop column layout. */
  variant?: 'full' | 'summaryOnly' | 'bulletsOnly';
}

export default function ProductPdpValueSummary({
  summaryLine,
  bullets = [],
  variant = 'full',
}: ProductPdpValueSummaryProps) {
  const items = bullets.filter((b) => b.trim().length > 0).slice(0, 5);
  const showSummary = variant !== 'bulletsOnly' && summaryLine.trim().length > 0;
  const showBullets = variant !== 'summaryOnly' && items.length > 0;
  if (!showSummary && !showBullets) return null;

  return (
    <section
      className="rounded-2xl border border-gray-100 bg-surface p-5 shadow-sm"
      aria-labelledby="pdp-value-summary-heading"
    >
      <h2 id="pdp-value-summary-heading" className="sr-only">
        At a glance
      </h2>
      {showSummary ? <p className="text-sm font-medium text-gray-900 mb-3">{summaryLine}</p> : null}
      {showBullets ? (
        <ul className="list-none space-y-2 p-0 m-0">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
