 import Link from 'next/link';

 interface NavItem {
   href: string;
   label: string;
   icon: string;
 }

 interface SidebarProps {
   items: NavItem[];
   activePath: string | null;
 }

 const iconMap: Record<string, React.ReactElement> = {
   home: (
     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
       <path
         strokeLinecap="round"
         strokeLinejoin="round"
         strokeWidth={2}
         d="M3 10.5L12 3l9 7.5v9a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 19.5v-9z"
       />
     </svg>
   ),
   chart: (
     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m6 14V9m6 10V7m6 12H2" />
     </svg>
   ),
   feed: (
     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
     </svg>
   ),
   email: (
     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v12H4z" />
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7l8 6 8-6" />
     </svg>
   ),
   sms: (
     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16v11H7l-3 3V5z" />
     </svg>
   ),
   ads: (
     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4l9 16 9-16" />
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16" />
     </svg>
   ),
   reviews: (
     <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l2.5 5 5.5.8-4 3.9.9 5.6-4.9-2.6-4.9 2.6.9-5.6-4-3.9 5.5-.8z" />
     </svg>
   ),
 };

 export function Sidebar({ items, activePath }: SidebarProps) {
   return (
     <aside className="hidden w-64 border-r border-gray-200 bg-white lg:flex lg:flex-col">
       <div className="border-b border-gray-200 px-6 py-6">
         <p className="text-xs font-semibold uppercase tracking-wide text-action">The Equestrian</p>
         <h2 className="text-lg font-semibold text-gray-900">Admin CRM</h2>
         <p className="text-xs text-gray-500">Operations & growth</p>
       </div>
       <nav className="flex-1 space-y-1 px-3 py-6">
         {items.map((item) => {
           const isActive = activePath === item.href;
           return (
             <Link
               key={item.href}
               href={item.href}
               className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                 isActive
                   ? 'bg-action/10 text-action'
                   : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
               }`}
             >
               <span className="text-gray-500">{iconMap[item.icon]}</span>
               {item.label}
             </Link>
           );
         })}
       </nav>
       <div className="border-t border-gray-200 px-6 py-4 text-xs text-gray-500">
         Data syncs and AI insights update throughout the day.
       </div>
     </aside>
   );
 }
