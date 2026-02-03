 'use client';

 import Link from 'next/link';
 import { usePathname, useRouter } from 'next/navigation';
 import { useMemo, useState } from 'react';
 import { Sidebar } from './Sidebar';

 interface AdminLayoutProps {
   title: string;
   subtitle?: string;
   children: React.ReactNode;
 }

 export function AdminLayout({ title, subtitle, children }: AdminLayoutProps) {
   const pathname = usePathname();
   const router = useRouter();
   const [isLoggingOut, setIsLoggingOut] = useState(false);

   const navItems = useMemo(
     () => [
       { href: '/admin', label: 'Dashboard', icon: 'home' },
       { href: '/admin/seo', label: 'SEO & Analytics', icon: 'chart' },
       { href: '/admin/feeds', label: 'Marketing Feeds', icon: 'feed' },
       { href: '/admin/email', label: 'Email Campaigns', icon: 'email' },
       { href: '/admin/sms', label: 'SMS Campaigns', icon: 'sms' },
       { href: '/admin/ads', label: 'Ad Optimization', icon: 'ads' },
       { href: '/admin/reviews', label: 'Reviews', icon: 'reviews' },
     ],
     []
   );

   const handleLogout = async () => {
     setIsLoggingOut(true);
     try {
       await fetch('/api/admin/auth', { method: 'DELETE' });
       router.push('/admin/login');
       router.refresh();
     } finally {
       setIsLoggingOut(false);
     }
   };

   return (
     <div className="min-h-screen bg-gray-50 text-gray-900">
       <div className="flex min-h-screen">
         <Sidebar items={navItems} activePath={pathname} />
         <main className="flex-1">
           <header className="border-b border-gray-200 bg-white">
             <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
               <div>
                 <p className="text-xs font-semibold uppercase tracking-wide text-action">
                   Admin CRM
                 </p>
                 <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                 {subtitle ? (
                   <p className="text-sm text-gray-500">{subtitle}</p>
                 ) : null}
               </div>
               <div className="flex items-center gap-4">
                 <Link
                   href="/"
                   className="text-sm font-medium text-gray-600 hover:text-action"
                 >
                   View Store
                 </Link>
                 <button
                   type="button"
                   onClick={handleLogout}
                   disabled={isLoggingOut}
                   className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                 >
                   {isLoggingOut ? 'Signing out...' : 'Sign out'}
                 </button>
               </div>
             </div>
           </header>
           <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
         </main>
       </div>
     </div>
   );
 }
