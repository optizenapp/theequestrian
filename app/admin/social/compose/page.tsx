import { AdminLayout } from '@/components/admin/AdminLayout';
import { SocialTabs } from '../SocialTabs';
import { SocialComposeForm } from './SocialComposeForm';

export default function SocialComposePage() {
  return (
    <AdminLayout title="Social Posting" subtitle="Create manual, URL-context, and URL-video drafts">
      <SocialTabs active="compose" />
      <SocialComposeForm />
    </AdminLayout>
  );
}
