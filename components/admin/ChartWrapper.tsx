 interface ChartWrapperProps {
   title: string;
   description?: string;
   children?: React.ReactNode;
 }

 export function ChartWrapper({ title, description, children }: ChartWrapperProps) {
   return (
     <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
       <div className="mb-4">
         <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
         {description ? <p className="text-xs text-gray-500">{description}</p> : null}
       </div>
       <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
         {children || 'Chart placeholder'}
       </div>
     </div>
   );
 }
