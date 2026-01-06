'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Users, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isHydrated) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'admin') {
        router.push('/dashboard');
      } else {
        setIsChecking(false);
      }
    }
  }, [isAuthenticated, isHydrated, user, router]);

  if (!isHydrated || isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <p className="text-sm text-purple-100">Platform Management</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 py-4">
            <Link
              href="/admin"
              className="text-gray-700 hover:text-primary-600 font-medium transition"
            >
              Overview
            </Link>
            <Link
              href="/admin/users"
              className="text-gray-700 hover:text-primary-600 font-medium transition"
            >
              Users
            </Link>
            <Link
              href="/admin/analytics"
              className="text-gray-700 hover:text-primary-600 font-medium transition"
            >
              Analytics
            </Link>
            <Link
              href="/admin/system"
              className="text-gray-700 hover:text-primary-600 font-medium transition"
            >
              System
            </Link>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
