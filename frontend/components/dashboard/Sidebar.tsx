'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Key,
  FileText,
  Users,
  Send,
  CreditCard
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sessions', href: '/dashboard/sessions', icon: Users },
  { name: 'Messages', href: '/dashboard/messages', icon: Send },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Documentation', href: '/dashboard/docs', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 mt-4">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white">
          <h4 className="font-semibold mb-1">Upgrade to Pro</h4>
          <p className="text-xs text-primary-100 mb-3">
            Get unlimited sessions and messages
          </p>
          <Link
            href="/dashboard/billing"
            className="block text-center bg-white text-primary-600 text-sm font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </aside>
  );
}
