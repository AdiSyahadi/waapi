'use client';

import { useState, useRef } from 'react';
import { Send, Image, FileText, Users, MessageCircle } from 'lucide-react';
import { messagesAPI, sessionsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export default function MessagesPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'media'>('text');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    to: '',
    message: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data } = await sessionsAPI.list();
      // Backend returns data.data.sessions, filter only connected ones
      const sessionList = data?.data?.sessions || data?.data || [];
      setSessions(sessionList.filter((s: any) => s.status === 'connected'));
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) {
      toast.error('Please select a session');
      return;
    }

    setLoading(true);
    try {
      await messagesAPI.sendText({
        sessionId: selectedSession,
        to: formData.to,
        message: formData.message,
      });
      toast.success('Message sent successfully!');
      setFormData({ to: '', message: '', file: null });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !formData.file) {
      toast.error('Please select a session and file');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('phone', formData.to);
      data.append('caption', formData.message);
      data.append('file', formData.file);
      
      // Detect media type from file MIME type
      const mimeType = formData.file.type;
      let mediaType = 'document'; // default
      if (mimeType.startsWith('image/')) mediaType = 'image';
      else if (mimeType.startsWith('video/')) mediaType = 'video';
      else if (mimeType.startsWith('audio/')) mediaType = 'audio';
      
      data.append('type', mediaType);

      await messagesAPI.sendMedia(selectedSession, data);
      toast.success('Media sent successfully!');
      setFormData({ to: '', message: '', file: null });
      // Reset file input element
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send media');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Send Messages</h1>
        <p className="text-gray-600 mt-1">Send text messages and media to your contacts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Message Type Selector */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setMessageType('text')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  messageType === 'text'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MessageCircle className="inline h-5 w-5 mr-2" />
                Text Message
              </button>
              <button
                onClick={() => setMessageType('media')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  messageType === 'media'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Image className="inline h-5 w-5 mr-2" />
                Media
              </button>
            </div>

            <form onSubmit={messageType === 'text' ? handleSendText : handleSendMedia}>
              {/* Session Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Session
                </label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  required
                >
                  <option value="">Choose a session...</option>
                  {sessions.map((session: any) => (
                    <option key={session.id} value={session.id}>
                      {session.name} ({session.phoneNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Phone Number
                </label>
                <input
                  type="text"
                  value={formData.to}
                  onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="6281234567890"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: Country code + number (e.g., 6281234567890)
                </p>
              </div>

              {messageType === 'text' ? (
                <>
                  {/* Text Message */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      placeholder="Type your message here..."
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* File Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload File
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                        className="hidden"
                        id="file-upload"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          {formData.file ? formData.file.name : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Images, videos, documents (max 16MB)
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caption (optional)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      placeholder="Add a caption..."
                    />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send {messageType === 'text' ? 'Message' : 'Media'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
                <Users className="inline h-5 w-5 mr-2 text-gray-600" />
                <span className="font-medium text-gray-900">Broadcast</span>
                <p className="text-xs text-gray-600 mt-1">Send to multiple contacts</p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
                <FileText className="inline h-5 w-5 mr-2 text-gray-600" />
                <span className="font-medium text-gray-900">Templates</span>
                <p className="text-xs text-gray-600 mt-1">Use saved templates</p>
              </button>
            </div>
          </div>

          <div className="bg-primary-50 rounded-xl border border-primary-200 p-6">
            <h4 className="font-semibold text-primary-900 mb-2">💡 Tips</h4>
            <ul className="text-sm text-primary-800 space-y-2">
              <li>• Use international format for phone numbers</li>
              <li>• Max file size: 16MB</li>
              <li>• Messages are queued for delivery</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
