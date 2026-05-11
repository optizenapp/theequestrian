import { AdminLayout } from '@/components/admin/AdminLayout';
import { AccountStatusCards } from './AccountStatusCards';
import { SocialTabs } from '../SocialTabs';

export default function SocialAccountsPage() {
  return (
    <AdminLayout title="Social Posting" subtitle="Connect and verify publishing channels">
      <SocialTabs active="accounts" />
      <AccountStatusCards />
    </AdminLayout>
  );
}
