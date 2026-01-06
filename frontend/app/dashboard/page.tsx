'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI } from '@/lib/api';
import { BarChart3, MessageSquare, Activity, TrendingUp } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await analyticsAPI.getDashboard();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Messages"
          value={stats?.overview?.messagesSentToday || 0}
          icon={MessageSquare}
          trend={+12.5}
          color="blue"
        />
        <StatsCard
          title="Active Sessions"
          value={stats?.overview?.activeSessions || 0}
          icon={Activity}
          trend={+5.2}
          color="green"
        />
        <StatsCard
          title="Success Rate"
          value={`${stats?.overview?.deliveryRate || 0}%`}
          icon={TrendingUp}
          trend={+2.1}
          color="purple"
        />
        <StatsCard
          title="API Calls Today"
          value={stats?.overview?.apiRequestsToday || 0}
          icon={BarChart3}
          trend={-3.4}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.event}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activity.status === 'success' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No recent activity</p>
                <p className="text-gray-400 text-xs mt-1">Start sending messages to see activity here</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition">
              <p className="font-medium text-primary-900">Create New Session</p>
              <p className="text-sm text-primary-700">Connect a new WhatsApp account</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
              <p className="font-medium text-gray-900">Send Message</p>
              <p className="text-sm text-gray-600">Send a message to contacts</p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
              <p className="font-medium text-gray-900">View Analytics</p>
              <p className="text-sm text-gray-600">Check detailed statistics</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
