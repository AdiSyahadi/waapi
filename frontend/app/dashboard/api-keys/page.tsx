'use client';

import { useEffect, useState } from 'react';
import { Key, Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { apiKeysAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const { data } = await apiKeysAPI.list();
      setApiKeys(data.data || []);
    } catch (error) {
      console.error('Failed to fetch API keys');
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await apiKeysAPI.create({ name: newKeyName });
      setCreatedKey(data.data.key);
      setNewKeyName('');
      toast.success('API key created successfully!');
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await apiKeysAPI.revoke(keyId);
      toast.success('API key revoked successfully');
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const maskKey = (key: string) => {
    return `${key.substring(0, 8)}${'•'.repeat(32)}${key.substring(key.length - 8)}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">Manage your API keys for programmatic access</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Key
        </button>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your API Keys</h3>
          <p className="text-sm text-gray-600 mt-1">Keep your keys secure and never share them publicly</p>
        </div>

        {apiKeys.length === 0 ? (
          <div className="p-12 text-center">
            <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys Yet</h3>
            <p className="text-gray-600 mb-6">Create your first API key to start using the API</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
            >
              Create API Key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {apiKeys.map((apiKey: any) => (
              <div key={apiKey.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{apiKey.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        apiKey.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {apiKey.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 mb-3">
                      <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono text-gray-800">
                        {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key || 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                        title={visibleKeys.has(apiKey.id) ? 'Hide' : 'Show'}
                      >
                        {visibleKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(apiKey.key || '')}
                        className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <span>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                      <span>Last used: {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString() : 'Never'}</span>
                      <span>Calls: {apiKey.usageCount || 0}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeKey(apiKey.id)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Revoke key"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Best Practices */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h4 className="font-semibold text-yellow-900 mb-2">🔒 Security Best Practices</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Never commit API keys to version control</li>
          <li>• Use environment variables to store keys in your applications</li>
          <li>• Rotate keys regularly and revoke unused keys</li>
          <li>• Use separate keys for development and production environments</li>
          <li>• Monitor API usage for suspicious activity</li>
        </ul>
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            {!createdKey ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create New API Key</h3>
                <form onSubmit={handleCreateKey}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Key Name
                    </label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      placeholder="e.g., Production API Key"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Choose a descriptive name to identify this key
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Key'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-4">API Key Created!</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    ⚠️ <strong>Important:</strong> Copy this key now. You won't be able to see it again!
                  </p>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <code className="text-sm font-mono text-gray-800 break-all">{createdKey}</code>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => copyToClipboard(createdKey)}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Key
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatedKey('');
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
