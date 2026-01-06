'use client';

import { useState } from 'react';
import { Code, BookOpen, Zap, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('quick-start');
  const [copiedCode, setCopiedCode] = useState('');

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const sections = [
    { id: 'quick-start', label: 'Quick Start', icon: Zap },
    { id: 'authentication', label: 'Authentication', icon: BookOpen },
    { id: 'endpoints', label: 'API Endpoints', icon: Code },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
        <p className="text-gray-600 mt-1">Complete guide to integrate WhatsApp API</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-2 sticky top-6">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition ${
                  activeSection === section.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <section.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Start */}
          {activeSection === 'quick-start' && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start</h2>
                <p className="text-gray-700 mb-6">
                  Get started with WhatsApp API in minutes. Follow these simple steps to send your first message.
                </p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Get Your API Key</h3>
                    <p className="text-gray-700 mb-3">
                      Navigate to the API Keys page in your dashboard and create a new API key.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <code className="text-sm text-gray-800">API_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxx</code>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Create a Session</h3>
                    <p className="text-gray-700 mb-3">
                      Create a WhatsApp session and scan the QR code with your phone.
                    </p>
                    <div className="bg-gray-900 rounded-lg p-4 relative">
                      <button
                        onClick={() => copyCode('curl -X POST https://api.yourapp.com/api/v1/sessions \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name": "My Session", "phoneNumber": "6281234567890"}\'', 'session')}
                        className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition"
                      >
                        {copiedCode === 'session' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <pre className="text-sm text-green-400 overflow-x-auto">
{`curl -X POST https://api.yourapp.com/api/v1/sessions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Session", "phoneNumber": "6281234567890"}'`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Send a Message</h3>
                    <p className="text-gray-700 mb-3">
                      Once your session is connected, you can start sending messages.
                    </p>
                    <div className="bg-gray-900 rounded-lg p-4 relative">
                      <button
                        onClick={() => copyCode('curl -X POST https://api.yourapp.com/api/v1/messages/text \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"sessionId": "SESSION_ID", "to": "6281234567890", "message": "Hello World!"}\'', 'message')}
                        className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition"
                      >
                        {copiedCode === 'message' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <pre className="text-sm text-green-400 overflow-x-auto">
{`curl -X POST https://api.yourapp.com/api/v1/messages/text \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId": "SESSION_ID", "to": "6281234567890", "message": "Hello World!"}'`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
                <h4 className="font-semibold text-primary-900 mb-2">💡 Need Help?</h4>
                <p className="text-primary-800 text-sm">
                  Check out our comprehensive guides below or contact support if you need assistance.
                </p>
              </div>
            </>
          )}

          {/* Authentication */}
          {activeSection === 'authentication' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication</h2>
              <p className="text-gray-700 mb-6">
                All API requests must be authenticated using an API key passed in the Authorization header.
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Bearer Token</h3>
                  <p className="text-gray-700 mb-3">
                    Include your API key in the Authorization header with the Bearer scheme:
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <button
                      onClick={() => copyCode('Authorization: Bearer YOUR_API_KEY', 'bearer')}
                      className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition"
                    >
                      {copiedCode === 'bearer' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <pre className="text-sm text-green-400">Authorization: Bearer YOUR_API_KEY</pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Example Request</h3>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <pre className="text-sm text-green-400 overflow-x-auto">
{`const response = await fetch('https://api.yourapp.com/api/v1/sessions', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`}
                    </pre>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Security Warning:</strong> Keep your API keys secure! Never expose them in client-side code or public repositories.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* API Endpoints */}
          {activeSection === 'endpoints' && (
            <div className="space-y-6">
              {/* Sessions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Sessions</h2>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">POST</span>
                      <code className="text-sm font-mono text-gray-800">/api/v1/sessions</code>
                    </div>
                    <p className="text-gray-700 mb-3">Create a new WhatsApp session</p>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-sm text-green-400 overflow-x-auto">
{`{
  "name": "My Session",
  "phoneNumber": "6281234567890"
}`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">GET</span>
                      <code className="text-sm font-mono text-gray-800">/api/v1/sessions</code>
                    </div>
                    <p className="text-gray-700">List all sessions</p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">DELETE</span>
                      <code className="text-sm font-mono text-gray-800">/api/v1/sessions/:id</code>
                    </div>
                    <p className="text-gray-700">Delete a session</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Messages</h2>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">POST</span>
                      <code className="text-sm font-mono text-gray-800">/api/v1/messages/text</code>
                    </div>
                    <p className="text-gray-700 mb-3">Send a text message</p>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-sm text-green-400 overflow-x-auto">
{`{
  "sessionId": "SESSION_ID",
  "to": "6281234567890",
  "message": "Hello from API!"
}`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">POST</span>
                      <code className="text-sm font-mono text-gray-800">/api/v1/messages/media</code>
                    </div>
                    <p className="text-gray-700 mb-3">Send media (image, video, document)</p>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <pre className="text-sm text-green-400 overflow-x-auto">
{`Form Data:
- sessionId: SESSION_ID
- to: 6281234567890
- media: [file]
- caption: "Check this out!" (optional)`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">GET</span>
                      <code className="text-sm font-mono text-gray-800">/api/v1/messages</code>
                    </div>
                    <p className="text-gray-700">Get message history</p>
                  </div>
                </div>
              </div>

              {/* Rate Limits */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Rate Limits</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Starter: 100 requests/minute</li>
                  <li>• Professional: 500 requests/minute</li>
                  <li>• Enterprise: 2000 requests/minute</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
