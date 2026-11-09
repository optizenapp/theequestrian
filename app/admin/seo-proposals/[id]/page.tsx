import { notFound } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import ProposalReview from '@/components/admin/proposals/ProposalReview';

export default async function SeoProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <AdminLayout title="Review proposal" subtitle="Edit if needed, then approve to publish or reject">
      <ProposalReview id={id} />
    </AdminLayout>
  );
}
