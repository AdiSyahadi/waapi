'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Download, Calendar } from 'lucide-react';
import { analyticsAPI } from '@/lib/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [messageStats, apiStats] = await Promise.all([
        analyticsAPI.getMessageStats({ range: dateRange }),
        analyticsAPI.getApiStats({ range: dateRange }),
      ]);
      
      setStats({
        messages: messageStats.data.data,
        api: apiStats.data.data,
      });
    } catch (error) {
      console.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const messageChartData = [
    { date: 'Mon', sent: 120, delivered: 115, read: 98, failed: 5 },
    { date: 'Tue', sent: 150, delivered: 145, read: 130, failed: 5 },
    { date: 'Wed', sent: 180, delivered: 175, read: 160, failed: 5 },
    { date: 'Thu', sent: 200, delivered: 195, read: 180, failed: 5 },
    { date: 'Fri', sent: 170, delivered: 165, read: 150, failed: 5 },
    { date: 'Sat', sent: 140, delivered: 135, read: 120, failed: 5 },
    { date: 'Sun', sent: 100, delivered: 95, read: 85, failed: 5 },
  ];

  const apiChartData = [
    { hour: '00:00', requests: 45, success: 43, failed: 2 },
    { hour: '04:00', requests: 30, success: 29, failed: 1 },
    { hour: '08:00', requests: 120, success: 118, failed: 2 },
    { hour: '12:00', requests: 200, success: 195, failed: 5 },
    { hour: '16:00', requests: 180, success: 177, failed: 3 },
    { hour: '20:00', requests: 150, success: 148, failed: 2 },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Detailed insights and metrics</p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Messages</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">12,450</p>
          <p className="text-sm text-green-600 mt-1">+12.5% from last period</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Delivery Rate</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">97.8%</p>
          <p className="text-sm text-green-600 mt-1">+0.3% from last period</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Read Rate</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">85.2%</p>
          <p className="text-sm text-green-600 mt-1">+2.1% from last period</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">API Calls</span>
            <BarChart3 className="h-5 w-5 text-primary-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">24,890</p>
          <p className="text-sm text-gray-600 mt-1">98.7% success rate</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Message Statistics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Statistics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={messageChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="#0ea5e9" strokeWidth={2} />
              <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="read" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* API Usage */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={apiChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="success" fill="#10b981" />
              <Bar dataKey="failed" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Messages Sent
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">12,450</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+12.5%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    ↑ Increasing
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Average Response Time
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">245ms</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">-15ms</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    ↓ Improving
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Active Sessions
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">8</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+2</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    ↑ Growing
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
