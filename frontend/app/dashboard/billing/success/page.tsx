'use client';

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDevelopment = searchParams.get('development') === 'true';
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Redirect to billing page after 3 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard/billing');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isDevelopment ? 'Development Mode Active' : 'Payment Successful!'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {isDevelopment 
            ? 'This is a simulated payment success in development mode. In production, this would be a real Stripe checkout completion.'
            : 'Your subscription has been activated successfully.'
          }
        </p>

        {sessionId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Session ID:</p>
            <p className="text-sm font-mono text-gray-900 break-all">{sessionId}</p>
          </div>
        )}

        <p className="text-sm text-gray-500">
          Redirecting to billing page in 3 seconds...
        </p>

        <button
          onClick={() => router.push('/dashboard/billing')}
          className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          Go to Billing Now
        </button>
      </div>
    </div>
  );
}
