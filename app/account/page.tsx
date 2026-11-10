import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AccountRewards from '@/components/account/AccountRewards';
import { getCustomerAccountConfig } from '@/lib/customer-account/config';
import { fetchAccountCustomer, type AccountCustomer } from '@/lib/customer-account/customer-api';
import { getCustomerAccountEndpoints } from '@/lib/customer-account/discovery';
import { CUSTOMER_SESSION_COOKIE, isSessionExpired, readCustomerSession } from '@/lib/customer-account/session';
import { getCustomerRewards } from '@/lib/rewards/customer-history';
import { getRewardsSettings } from '@/lib/rewards/settings';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'syd1';

export const metadata: Metadata = {
  title: 'My account | The Equestrian',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ signin?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const config = getCustomerAccountConfig();
  if (!config) notFound();

  const { signin } = await searchParams;
  const cookieStore = await cookies();
  const session = readCustomerSession(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value, config);
  if (session && isSessionExpired(session)) redirect('/api/account/refresh?return_to=/account');

  let customer: AccountCustomer | null = null;
  if (session) {
    try {
      customer = await fetchAccountCustomer(await getCustomerAccountEndpoints(config), session.accessToken);
    } catch (error) {
      console.error('[account] Failed to load customer:', error);
    }
  }

  if (!customer) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
        {signin === 'failed' ? (
          <p role="alert" className="mt-3 text-sm text-rose-600">We couldn&apos;t sign you in. Please try again.</p>
        ) : null}
        <p className="mt-3 text-sm text-gray-600">
          Sign in with the email you use at checkout to see your Equestrian Rewards. We&apos;ll email you a one-time code.
        </p>
        <form action="/api/account/login" method="get" className="mt-6">
          <input type="hidden" name="return_to" value="/account" />
          <button
            type="submit"
            className="rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-action-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            Sign in
          </button>
        </form>
      </main>
    );
  }

  const [rewards, settings] = await Promise.all([getCustomerRewards(customer.id), getRewardsSettings()]);
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {customer.firstName ? `Hi ${customer.firstName}` : 'My account'}
          </h1>
          {customer.email ? <p className="text-sm text-gray-600">{customer.email}</p> : null}
        </div>
        <form action="/api/account/logout" method="post">
          <button type="submit" className="text-sm font-medium text-gray-600 underline hover:text-action">
            Sign out
          </button>
        </form>
      </div>
      <AccountRewards rewards={rewards} spendable={settings.issuanceEnabled} />
    </main>
  );
}
