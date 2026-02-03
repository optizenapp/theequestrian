 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { StatCard } from '@/components/admin/StatCard';
 import { DataTable } from '@/components/admin/DataTable';

 const campaignRows = [
   { id: '1', name: 'Welcome Series', status: 'Draft', audience: 'New subscribers', lastSent: 'N/A' },
   { id: '2', name: 'Cart Recovery', status: 'Paused', audience: 'Abandoned carts', lastSent: 'N/A' },
   { id: '3', name: 'Weekly deals', status: 'Planned', audience: 'All subscribers', lastSent: 'N/A' },
 ];

 export default function AdminEmailPage() {
   return (
     <AdminLayout title="Email Campaigns" subtitle="Automations, sequences, and lists">
       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
         <StatCard label="Subscribers" value="38,420" change="+1.1%" helper="Moosend list" />
         <StatCard label="Open rate" value="34%" change="+2%" helper="Last 30 days" />
         <StatCard label="Click rate" value="4.8%" change="+0.6%" helper="Last 30 days" />
         <StatCard label="Revenue" value="$42.6k" change="+8%" helper="Attributed" />
       </div>

       <div className="mt-6 grid gap-6 lg:grid-cols-2">
         <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
           <h3 className="text-sm font-semibold text-gray-900">Sequence builder</h3>
           <p className="mt-2 text-sm text-gray-600">
             Replace Moosend with Mailgun or SendGrid. Use sequences for welcome, win-back, and
             post-purchase journeys.
           </p>
           <div className="mt-4 space-y-2 text-xs text-gray-500">
             <div className="rounded-lg border border-dashed border-gray-200 p-3">
               Drag and drop steps once integration is ready.
             </div>
           </div>
         </div>
         <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
           <h3 className="text-sm font-semibold text-gray-900">Subscriber segments</h3>
           <ul className="mt-3 space-y-2 text-sm text-gray-600">
             <li>VIP customers (repeat orders)</li>
             <li>High intent browse sessions</li>
             <li>New customers (first 30 days)</li>
             <li>Churn risk (no purchase 90 days)</li>
           </ul>
         </div>
       </div>

       <div className="mt-6">
         <DataTable
           title="Campaigns"
           columns={[
             { key: 'name', header: 'Campaign' },
             { key: 'status', header: 'Status' },
             { key: 'audience', header: 'Audience' },
             { key: 'lastSent', header: 'Last sent' },
           ]}
           rows={campaignRows}
         />
       </div>
     </AdminLayout>
   );
 }
