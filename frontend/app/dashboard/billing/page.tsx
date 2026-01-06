'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Download, CheckCircle, XCircle } from 'lucide-react';
import { billingAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [subData, invData, plansData] = await Promise.all([
        billingAPI.getSubscription(),
        billingAPI.getInvoices(),
        billingAPI.getPlans(),
      ]);
      
      setSubscription(subData.data.data);
      setInvoices(Array.isArray(invData.data.data) ? invData.data.data : []);
      setPlans(Array.isArray(plansData.data.data) ? plansData.data.data : []);
    } catch (error) {
      console.error('Failed to fetch billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      console.log('Creating checkout session for plan:', planId);
      const response = await billingAPI.createCheckoutSession({ 
        planId,
        successUrl: `${window.location.origin}/dashboard/billing/success`,
        cancelUrl: `${window.location.origin}/dashboard/billing/canceled`
      });
      
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      
      const checkoutData = response.data;
      
      if (checkoutData.success && checkoutData.data?.url) {
        console.log('Redirecting to:', checkoutData.data.url);
        // In development mode, show success message instead of redirecting
        if (checkoutData.data.url.includes('development=true')) {
          toast.success('Development Mode: Checkout session created! Redirecting to success page...');
          setTimeout(() => {
            window.location.href = checkoutData.data.url;
          }, 1500);
        } else {
          window.location.href = checkoutData.data.url;
        }
      } else {
        console.error('Invalid response structure:', checkoutData);
        toast.error('Invalid checkout session response');
      }
    } catch (error: any) {
      console.error('Checkout session error:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.message || 'Failed to create checkout session');
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      return;
    }

    try {
      await billingAPI.cancelSubscription();
      toast.success('Subscription cancelled successfully');
      fetchBillingData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
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
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-1">Manage your subscription and billing information</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Plan</h3>
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-bold text-primary-600">
                {subscription?.plan?.name || 'Free'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscription?.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {subscription?.status || 'inactive'}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ${subscription?.plan?.price || 0}<span className="text-lg text-gray-600">/month</span>
            </p>
            {subscription?.current_period_end && (
              <p className="text-sm text-gray-600 mt-2">
                Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
          {subscription?.status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
            >
              Cancel Subscription
            </button>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Messages This Month</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900">
                {subscription?.usage?.messages || 0}
              </p>
              <p className="text-sm text-gray-600">
                / {subscription?.plan?.limits?.messages || '∞'}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-primary-600 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min((subscription?.usage?.messages || 0) / (subscription?.plan?.limits?.messages || 1) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Active Sessions</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900">
                {subscription?.usage?.sessions || 0}
              </p>
              <p className="text-sm text-gray-600">
                / {subscription?.plan?.limits?.sessions || '∞'}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min((subscription?.usage?.sessions || 0) / (subscription?.plan?.limits?.sessions || 1) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">API Calls</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-900">
                {subscription?.usage?.apiCalls || 0}
              </p>
              <p className="text-sm text-gray-600">
                / {subscription?.plan?.limits?.apiCalls || '∞'}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-purple-600 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min((subscription?.usage?.apiCalls || 0) / (subscription?.plan?.limits?.apiCalls || 1) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upgrade Your Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan: any) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border-2 p-6 ${
                subscription?.plan?.id === plan.id
                  ? 'border-primary-600'
                  : 'border-gray-200'
              }`}
            >
              <h4 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h4>
              <p className="text-3xl font-bold text-gray-900 mb-4">
                ${plan.price}<span className="text-lg text-gray-600">/mo</span>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                  {plan.limits?.max_sessions || plan.limits?.maxSessions || 'Unlimited'} WhatsApp sessions
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                  {plan.limits?.max_messages_per_day || plan.limits?.maxMessages || 'Unlimited'} messages/day
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                  {plan.limits?.max_api_keys || plan.limits?.apiCalls || 'Unlimited'} API keys
                </li>
                {(plan.features?.features || []).slice(0, 2).map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              {subscription?.plan?.id === plan.id ? (
                <button
                  disabled
                  className="w-full py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id.toString())}
                  className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
                >
                  {subscription ? 'Switch Plan' : 'Get Started'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Billing History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No invoices yet
                  </td>
                </tr>
              ) : (
                invoices.map((invoice: any) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{invoice.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${invoice.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button className="text-primary-600 hover:text-primary-700 font-medium">
                        <Download className="h-4 w-4 inline mr-1" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
