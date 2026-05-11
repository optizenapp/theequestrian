import { AdminLayout } from '@/components/admin/AdminLayout';
import { SocialTabs } from '../SocialTabs';
import { PromptEditor } from './PromptEditor';

export default function SocialPromptsPage() {
  return (
    <AdminLayout title="Social Posting" subtitle="Manage prompt templates for social copy generation">
      <SocialTabs active="prompts" />
      <PromptEditor />
    </AdminLayout>
  );
}
