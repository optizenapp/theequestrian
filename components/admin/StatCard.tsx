interface StatCardProps {
   label: string;
   value: string;
   change?: string;
   helper?: string;
 }

 export function StatCard({ label, value, change, helper }: StatCardProps) {
  const changeTone = change
    ? change.startsWith('-')
      ? 'text-rose-600'
      : 'text-emerald-600'
    : 'text-gray-400';
   return (
     <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
       <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
       <div className="mt-3 flex items-baseline gap-2">
         <span className="text-2xl font-semibold text-gray-900">{value}</span>
         {change ? (
          <span className={`text-xs font-semibold ${changeTone}`}>{change}</span>
         ) : null}
       </div>
       {helper ? <p className="mt-2 text-xs text-gray-500">{helper}</p> : null}
     </div>
   );
 }
