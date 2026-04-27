import { AdminLayout } from '@/components/admin/AdminLayout';
import AutoCampaignsPageClient from './AutoCampaignsPageClient';

export default function AdminAutoCampaignsPage() {
  return (
    <AdminLayout title="Auto campaigns" subtitle="Weekly brand, sale, and category sends; 24h non-opener resend on SES">
      <AutoCampaignsPageClient />
    </AdminLayout>
  );
}
