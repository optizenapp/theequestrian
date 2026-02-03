 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { StatCard } from '@/components/admin/StatCard';
 import { DataTable } from '@/components/admin/DataTable';

 const smsRows = [
   { id: '1', name: 'Order updates', status: 'Planned', recipients: 'All customers', lastSent: 'N/A' },
   { id: '2', name: 'VIP offer', status: 'Draft', recipients: 'VIP segment', lastSent: 'N/A' },
 ];

 export default function AdminSmsPage() {
   return (
     <AdminLayout title="SMS Campaigns" subtitle="Launch and track SMS sequences">
       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
         <StatCard label="SMS subscribers" value="6,420" change="+0.8%" helper="Opt-in list" />
         <StatCard label="Delivery rate" value="97%" helper="Last 30 days" />
         <StatCard label="Opt-out rate" value="0.8%" helper="Healthy range" />
         <StatCard label="Revenue" value="$8.2k" helper="Attributed" />
       </div>

       <div className="mt-6 grid gap-6 lg:grid-cols-2">
         <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
           <h3 className="text-sm font-semibold text-gray-900">Send an SMS</h3>
           <p className="mt-2 text-sm text-gray-600">
             Configure your SMS provider (Twilio, MessageBird, or Postscript) to enable sends.
           </p>
           <div className="mt-4 space-y-2 text-xs text-gray-500">
             <div className="rounded-lg border border-dashed border-gray-200 p-3">
               SMS composer and preview will appear here.
             </div>
           </div>
         </div>
         <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
           <h3 className="text-sm font-semibold text-gray-900">Compliance</h3>
           <ul className="mt-3 space-y-2 text-sm text-gray-600">
             <li>Collect explicit opt-in consent.</li>
             <li>Include STOP instructions in every campaign.</li>
             <li>Sync opt-outs across email and SMS.</li>
           </ul>
         </div>
       </div>

       <div className="mt-6">
         <DataTable
           title="SMS campaigns"
           columns={[
             { key: 'name', header: 'Campaign' },
             { key: 'status', header: 'Status' },
             { key: 'recipients', header: 'Recipients' },
             { key: 'lastSent', header: 'Last sent' },
           ]}
           rows={smsRows}
         />
       </div>
     </AdminLayout>
   );
 }
