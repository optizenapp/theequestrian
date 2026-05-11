import Link from 'next/link';

const tabs = [
  { href: '/admin/social/accounts', label: 'Accounts' },
  { href: '/admin/social/compose', label: 'Compose' },
  { href: '/admin/social/queue', label: 'Queue' },
  { href: '/admin/social/prompts', label: 'Prompts' },
];

export function SocialTabs({ active }: { active: 'accounts' | 'compose' | 'queue' | 'prompts' }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.href.endsWith(active);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              isActive
                ? 'border-action bg-action text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-action hover:text-action'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
