import { AdminLayout } from '@/components/admin/AdminLayout';
import { SocialTabs } from '../SocialTabs';
import { SocialQueueManager } from './SocialQueueManager';

export default function SocialQueuePage() {
  return (
    <AdminLayout title="Social Posting" subtitle="Review, edit, publish, and recover social drafts">
      <SocialTabs active="queue" />
      <SocialQueueManager />
    </AdminLayout>
  );
}
