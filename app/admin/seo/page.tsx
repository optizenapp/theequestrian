 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { StatCard } from '@/components/admin/StatCard';
 import { DataTable } from '@/components/admin/DataTable';
 import { ChartWrapper } from '@/components/admin/ChartWrapper';

 const pageRows = [
   { id: '1', page: '/horse/saddles', clicks: '4,220', impressions: '68,140', position: '4.1' },
   { id: '2', page: '/clothing', clicks: '3,118', impressions: '52,501', position: '5.2' },
   { id: '3', page: '/brands', clicks: '1,984', impressions: '31,876', position: '6.3' },
 ];

 const queryRows = [
   { id: '1', query: 'dressage saddles australia', clicks: '214', ctr: '4.8%', position: '3.2' },
   { id: '2', query: 'riding boots women', clicks: '188', ctr: '3.9%', position: '4.7' },
   { id: '3', query: 'horse rugs sale', clicks: '165', ctr: '5.1%', position: '2.9' },
 ];

 export default function AdminSeoPage() {
   return (
     <AdminLayout
       title="SEO & Analytics"
       subtitle="Google Search Console insights and AI recommendations"
     >
       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
         <StatCard label="Clicks (28 days)" value="48,220" change="+6.4%" helper="GSC" />
         <StatCard label="Impressions" value="812k" change="+9.2%" helper="GSC" />
         <StatCard label="Average CTR" value="5.3%" change="+0.4%" helper="GSC" />
         <StatCard label="Avg. Position" value="4.8" helper="Target < 5" />
       </div>

       <div className="mt-6 grid gap-6 lg:grid-cols-2">
         <ChartWrapper title="Traffic trend" description="Clicks & impressions over time">
           Connect GSC API to populate this chart.
         </ChartWrapper>
         <ChartWrapper title="Top performing categories" description="Clicks by category">
           Use category mapping + GSC to rank category pages.
         </ChartWrapper>
       </div>

       <div className="mt-6 grid gap-6 lg:grid-cols-2">
         <DataTable
           title="Top pages"
           columns={[
             { key: 'page', header: 'Page' },
             { key: 'clicks', header: 'Clicks' },
             { key: 'impressions', header: 'Impressions' },
             { key: 'position', header: 'Avg. Position' },
           ]}
           rows={pageRows}
         />
         <DataTable
           title="Top queries"
           columns={[
             { key: 'query', header: 'Query' },
             { key: 'clicks', header: 'Clicks' },
             { key: 'ctr', header: 'CTR' },
             { key: 'position', header: 'Avg. Position' },
           ]}
           rows={queryRows}
         />
       </div>

       <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
         <h3 className="text-sm font-semibold text-gray-900">AI recommendations</h3>
         <p className="mt-2 text-sm text-gray-600">
           LLM analysis will surface pages needing title tweaks, content expansion, or internal link
           improvements. Add GSC API credentials to activate.
         </p>
         <ul className="mt-4 space-y-2 text-sm text-gray-600">
           <li>Prioritize updating meta titles for top 10 pages with CTR below 3%.</li>
           <li>Refresh FAQs on high-impression pages to boost rich results.</li>
           <li>Detect cannibalized queries and consolidate category copy.</li>
         </ul>
       </div>
     </AdminLayout>
   );
 }
