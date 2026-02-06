import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type LineConfig = {
  key: string;
  label: string;
  color: string;
};

type KpiChartCardProps = {
  title: string;
  subtitle?: string;
  data: Array<Record<string, number | string | null>>;
  lines: LineConfig[];
  onOpen?: () => void;
};

export function KpiChartCard({ title, subtitle, data, lines, onOpen }: KpiChartCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
          {subtitle ? <p className="text-[11px] text-gray-400">{subtitle}</p> : null}
        </div>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="text-[11px] font-semibold text-action hover:text-pink-600"
          >
            Expand
          </button>
        ) : null}
      </div>
      <div className="h-28">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                formatter={(value) => (value == null ? '—' : String(value))}
                labelFormatter={(label) => `Date: ${label}`}
              />
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={false}
                  name={line.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            No data yet.
          </div>
        )}
      </div>
    </div>
  );
}
