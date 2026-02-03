 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { StatCard } from '@/components/admin/StatCard';
 import { DataTable } from '@/components/admin/DataTable';
 import { ChartWrapper } from '@/components/admin/ChartWrapper';

 const campaignRows = [
   { id: '1', campaign: 'Meta Prospecting', status: 'Paused', spend: '$2,480', roas: '2.8' },
   { id: '2', campaign: 'Google Shopping', status: 'Active', spend: '$4,120', roas: '3.4' },
   { id: '3', campaign: 'Brand Search', status: 'Active', spend: '$980', roas: '5.2' },
 ];

 export default function AdminAdsPage() {
   return (
     <AdminLayout title="Ad Optimization" subtitle="LLM insights for Google Ads & Meta">
       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
         <StatCard label="Ad spend" value="$7.6k" change="+4%" helper="Last 7 days" />
         <StatCard label="ROAS" value="3.6" change="+0.4" helper="Last 7 days" />
         <StatCard label="Conversions" value="318" change="+6%" helper="Tracked" />
         <StatCard label="AI actions" value="12" helper="Suggested today" />
       </div>

       <div className="mt-6 grid gap-6 lg:grid-cols-2">
         <ChartWrapper title="Spend vs ROAS" description="Monitor efficiency over time">
           Connect ad APIs to populate spend and return data.
         </ChartWrapper>
         <ChartWrapper title="Top creatives" description="AI-ranked performance">
           Upload creative assets to receive ranking insights.
         </ChartWrapper>
       </div>

       <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
         <h3 className="text-sm font-semibold text-gray-900">AI optimization checklist</h3>
         <ul className="mt-3 space-y-2 text-sm text-gray-600">
           <li>Identify underperforming ad sets and recommend budget shifts.</li>
           <li>Generate new headlines and descriptions for top SKUs.</li>
           <li>Detect creative fatigue and suggest refresh cycles.</li>
           <li>Monitor CPA targets and alert when thresholds are breached.</li>
         </ul>
       </div>

       <div className="mt-6">
         <DataTable
           title="Campaign performance"
           columns={[
             { key: 'campaign', header: 'Campaign' },
             { key: 'status', header: 'Status' },
             { key: 'spend', header: 'Spend' },
             { key: 'roas', header: 'ROAS' },
           ]}
           rows={campaignRows}
         />
       </div>
     </AdminLayout>
   );
 }
