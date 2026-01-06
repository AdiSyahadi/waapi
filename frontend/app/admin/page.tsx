'use client';

import { useEffect, useState } from 'react';
import { Users, MessageSquare, DollarSign, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import StatsCard from '@/components/dashboard/StatsCard';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await adminAPI.getStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch admin stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-600 mt-1">Monitor platform health and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          trend={12.5}
          color="blue"
        />
        <StatsCard
          title="Active Sessions"
          value={stats?.activeSessions || 0}
          icon={Activity}
          trend={8.2}
          color="green"
        />
        <StatsCard
          title="Messages Today"
          value={stats?.messagesToday || 0}
          icon={MessageSquare}
          trend={15.3}
          color="purple"
        />
        <StatsCard
          title="Revenue (MRR)"
          value={`$${stats?.monthlyRevenue || 0}`}
          icon={DollarSign}
          trend={23.1}
          color="orange"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h3>
          <div className="space-y-3">
            {[
              { name: 'John Doe', email: 'john@example.com', plan: 'Professional', date: '2 hours ago' },
              { name: 'Jane Smith', email: 'jane@example.com', plan: 'Starter', date: '5 hours ago' },
              { name: 'Bob Wilson', email: 'bob@example.com', plan: 'Enterprise', date: '1 day ago' },
            ].map((user, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-primary-600">{user.plan}</span>
                  <p className="text-xs text-gray-500">{user.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">API Response Time</span>
                <span className="text-sm text-green-600">125ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Database Load</span>
                <span className="text-sm text-yellow-600">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Server CPU</span>
                <span className="text-sm text-blue-600">32%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '32%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                <span className="text-sm text-purple-600">68%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start">
          <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-2">System Alerts</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 3 users approaching message limits</li>
              <li>• Scheduled maintenance in 48 hours</li>
              <li>• 2 API keys expiring this month</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
