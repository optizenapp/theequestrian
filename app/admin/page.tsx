 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { StatCard } from '@/components/admin/StatCard';
 import { DataTable } from '@/components/admin/DataTable';

 const activityRows = [
   { id: '1', action: 'Content sync', detail: '238 collection entries refreshed', time: '2 hours ago' },
   { id: '2', action: 'Reviews', detail: '12 new reviews pending', time: '4 hours ago' },
   { id: '3', action: 'Price update', detail: 'Auto-offset applied to 84 products', time: 'Yesterday' },
 ];

 export default function AdminDashboardPage() {
   return (
     <AdminLayout title="Dashboard" subtitle="CRM overview and system health">
       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
         <StatCard label="Total products" value="4,409" change="+2.4%" helper="Shopify catalog" />
         <StatCard label="Pending reviews" value="12" change="+5" helper="Needs approval" />
         <StatCard label="Email subscribers" value="38,420" change="+1.1%" helper="Moosend list" />
         <StatCard label="Orders (7 days)" value="1,284" change="+8.6%" helper="Shopify checkout" />
       </div>

       <div className="mt-6 grid gap-6 lg:grid-cols-3">
         <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
           <h3 className="text-sm font-semibold text-gray-900">Quick actions</h3>
           <p className="mt-1 text-xs text-gray-500">
             Common workflows for daily operations and growth.
           </p>
           <div className="mt-4 grid gap-3 sm:grid-cols-2">
             {[
               'Run GSC snapshot',
               'Review feed errors',
               'Draft email sequence',
               'Plan SMS campaign',
               'Request AI ad audit',
               'Export performance report',
             ].map((action) => (
               <div
                 key={action}
                 className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700"
               >
                 {action}
               </div>
             ))}
           </div>
         </div>

         <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
           <h3 className="text-sm font-semibold text-gray-900">System health</h3>
           <ul className="mt-4 space-y-3 text-sm text-gray-600">
             <li className="flex items-center justify-between">
               <span>Shopify sync</span>
               <span className="text-emerald-600">Healthy</span>
             </li>
             <li className="flex items-center justify-between">
               <span>Search index</span>
               <span className="text-emerald-600">Up to date</span>
             </li>
             <li className="flex items-center justify-between">
               <span>Pricing offset</span>
               <span className="text-amber-600">Monitoring</span>
             </li>
             <li className="flex items-center justify-between">
               <span>CRM feeds</span>
               <span className="text-gray-400">Not connected</span>
             </li>
           </ul>
         </div>
       </div>

       <div className="mt-6">
         <DataTable
           title="Recent activity"
           columns={[
             { key: 'action', header: 'Action' },
             { key: 'detail', header: 'Detail' },
             { key: 'time', header: 'Time' },
           ]}
           rows={activityRows}
         />
       </div>
     </AdminLayout>
   );
 }
