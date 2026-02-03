 interface Column<T> {
   key: keyof T;
   header: string;
 }

 interface DataTableProps<T> {
   title: string;
   columns: Column<T>[];
   rows: T[];
   emptyState?: string;
 }

 export function DataTable<T extends { id: string }>({
   title,
   columns,
   rows,
   emptyState = 'No data available yet.',
 }: DataTableProps<T>) {
   return (
     <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
       <div className="border-b border-gray-100 px-5 py-4">
         <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
       </div>
       <div className="overflow-x-auto">
         <table className="min-w-full text-sm">
           <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
             <tr>
               {columns.map((column) => (
                 <th key={String(column.key)} className="px-5 py-3 text-left font-semibold">
                   {column.header}
                 </th>
               ))}
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100 text-gray-700">
             {rows.length === 0 ? (
               <tr>
                 <td colSpan={columns.length} className="px-5 py-8 text-center text-sm text-gray-500">
                   {emptyState}
                 </td>
               </tr>
             ) : (
               rows.map((row) => (
                 <tr key={row.id} className="hover:bg-gray-50">
                   {columns.map((column) => (
                     <td key={String(column.key)} className="px-5 py-3">
                       {String(row[column.key])}
                     </td>
                   ))}
                 </tr>
               ))
             )}
           </tbody>
         </table>
       </div>
     </div>
   );
 }
