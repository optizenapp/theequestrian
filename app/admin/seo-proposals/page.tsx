import { AdminLayout } from '@/components/admin/AdminLayout';
import ProposalList from '@/components/admin/proposals/ProposalList';

export default function SeoProposalsPage() {
  return (
    <AdminLayout title="SEO Proposals" subtitle="Review the SEO bot's daily recommendations before they go live">
      <ProposalList />
    </AdminLayout>
  );
}
