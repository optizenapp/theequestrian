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

type KpiChartModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  data: Array<Record<string, number | string | null>>;
  lines: LineConfig[];
  controls?: React.ReactNode;
  onClose: () => void;
};

export function KpiChartModal({
  open,
  title,
  subtitle,
  data,
  lines,
  controls,
  onClose,
}: KpiChartModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
          >
            Close
          </button>
        </div>
        {controls ? <div className="border-b border-gray-100 px-6 py-4">{controls}</div> : null}
        <div className="px-6 py-6">
          <div className="h-72">
            {data.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
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
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                No data yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
