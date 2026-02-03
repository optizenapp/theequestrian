 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { StatCard } from '@/components/admin/StatCard';
 import { DataTable } from '@/components/admin/DataTable';

 const feedRows = [
   { id: '1', feed: 'Google Merchant Center', status: 'Needs setup', items: '0', lastSync: 'N/A' },
   { id: '2', feed: 'Facebook Catalog', status: 'Needs setup', items: '0', lastSync: 'N/A' },
   { id: '3', feed: 'Pixel tracking', status: 'Pending', items: '-', lastSync: 'N/A' },
 ];

 export default function AdminFeedsPage() {
   return (
     <AdminLayout title="Marketing Feeds" subtitle="GMC, Facebook, and pixel integrations">
       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
         <StatCard label="Feed items" value="0" helper="Pending setup" />
         <StatCard label="Errors" value="0" helper="No sync yet" />
         <StatCard label="Warnings" value="0" helper="Awaiting integration" />
         <StatCard label="Last sync" value="N/A" helper="Connect a feed" />
       </div>

       <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
         <h3 className="text-sm font-semibold text-gray-900">Connection checklist</h3>
         <ul className="mt-3 space-y-2 text-sm text-gray-600">
           <li>Connect Google Merchant Center to Shopify feed.</li>
           <li>Confirm Facebook Catalog sync and pixel events.</li>
           <li>Validate feed rules for shipping and pricing.</li>
         </ul>
       </div>

       <div className="mt-6">
         <DataTable
           title="Feed status"
           columns={[
             { key: 'feed', header: 'Feed' },
             { key: 'status', header: 'Status' },
             { key: 'items', header: 'Items' },
             { key: 'lastSync', header: 'Last sync' },
           ]}
           rows={feedRows}
         />
       </div>
     </AdminLayout>
   );
 }
