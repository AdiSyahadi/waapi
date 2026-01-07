'use client';

import { useEffect, useState } from 'react';
import { Plus, QrCode, Trash2, RefreshCw, MessageSquare, Power, Settings, Link2, Unlink, Copy } from 'lucide-react';
import { sessionsAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [qrCode, setQRCode] = useState<string | null>(null);

  const [newSession, setNewSession] = useState({
    name: '',
    phone_number: '',
    use_pairing: false,
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data } = await sessionsAPI.list();
      console.log('[Sessions] Full API Response:', JSON.stringify(data, null, 2));
      
      // Handle different response structures - backend returns data.data.sessions
      const sessionsList = data?.data?.sessions || data?.sessions || data?.data || data || [];
      console.log('[Sessions] Parsed sessions:', sessionsList);
      console.log('[Sessions] Sessions count:', sessionsList.length);
      
      // Ensure it's an array
      setSessions(Array.isArray(sessionsList) ? sessionsList : []);
    } catch (error: any) {
      console.error('[Sessions] Fetch error:', error);
      toast.error('Failed to fetch sessions');
      setSessions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      // Validate
      if (!newSession.name.trim()) {
        toast.error('Session name is required');
        return;
      }
      
      if (newSession.use_pairing && !newSession.phone_number.trim()) {
        toast.error('Phone number is required when using pairing code');
        return;
      }
      
      // Send data with snake_case as expected by backend
      const payload: any = {
        name: newSession.name.trim(),
        use_pairing: newSession.use_pairing,
      };
      
      // Only add phone_number if it has value
      if (newSession.phone_number.trim()) {
        payload.phone_number = newSession.phone_number.trim();
      }
      
      console.log('[Create Session] Sending payload:', payload);
      
      const { data } = await sessionsAPI.create(payload);
      console.log('[Create Session] Response:', data);
      
      // Backend returns data.session, not data.id
      const createdSession = data.data?.session || data.session;
      console.log('[Create Session] Created session:', createdSession);
      
      toast.success('Session created! ' + (newSession.use_pairing ? 'Check WhatsApp for pairing code.' : 'Scan QR code to connect.'));
      setShowCreateModal(false);
      setSelectedSession(createdSession);
      
      // Only fetch QR if not using pairing code
      if (!newSession.use_pairing && createdSession?.id) {
        setShowQRModal(true);
        setQRCode(null); // Clear old QR code
        // Wait 2 seconds for backend to generate QR before starting to fetch
        console.log('[Create Session] Waiting 2s for QR generation...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchQRCode(createdSession.id);
        // Start polling for connection status
        pollSessionStatus(createdSession.id);
      }
      
      fetchSessions();
      
      // Reset form
      setNewSession({ name: '', phone_number: '', use_pairing: false });
    } catch (error: any) {
      console.error('[Create Session] Error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create session';
      console.error('[Create Session] Error details:', error.response?.data);
      toast.error(errorMessage);
    }
  };

  // Poll session status to auto-close QR modal when connected
  const pollSessionStatus = async (sessionId: string, maxAttempts = 60) => {
    let consecutiveDisconnected = 0;
    const maxConsecutiveDisconnected = 5; // Only fail after 5 consecutive "disconnected" status (10 seconds)
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data } = await sessionsAPI.get(sessionId);
        const session = data?.data?.session || data?.data || data?.session;
        console.log('[Poll Status] Session status:', session?.status, 'attempt:', i + 1);
        
        if (session?.status === 'connected') {
          stopQRPolling(); // Stop QR polling
          toast.success('WhatsApp connected successfully!');
          setShowQRModal(false);
          setQRCode(null);
          fetchSessions();
          return;
        }
        
        // Only treat as failed if explicitly "failed" status
        if (session?.status === 'failed') {
          stopQRPolling();
          toast.error('Connection failed. Please try again.');
          setShowQRModal(false);
          setQRCode(null);
          fetchSessions();
          return;
        }
        
        // For disconnected, wait a bit longer before giving up
        // (status may temporarily be disconnected during connection process)
        if (session?.status === 'disconnected') {
          consecutiveDisconnected++;
          console.log('[Poll Status] Consecutive disconnected:', consecutiveDisconnected);
          
          if (consecutiveDisconnected >= maxConsecutiveDisconnected) {
            // Still disconnected after 10 seconds - likely actually failed
            stopQRPolling();
            toast.error('Connection timed out. Please try again.');
            setShowQRModal(false);
            setQRCode(null);
            fetchSessions();
            return;
          }
        } else {
          // Reset counter if status is not disconnected (e.g. connecting, qr)
          consecutiveDisconnected = 0;
        }
        
        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('[Poll Status] Error:', error);
      }
    }
    console.log('[Poll Status] Max attempts reached');
    stopQRPolling();
  };

  // Ref to control QR polling
  const qrPollingRef = { current: false };
  
  // Start continuous QR polling (QR changes every ~20 seconds)
  const startQRPolling = async (sessionId: string) => {
    qrPollingRef.current = true;
    console.log('[QR Polling] Started for session:', sessionId);
    
    let consecutiveErrors = 0;
    const maxErrors = 3;
    
    while (qrPollingRef.current) {
      try {
        const { data } = await sessionsAPI.getQR(sessionId);
        const qr = data?.data?.qr || data?.qr || data?.data?.qrCode;
        
        if (qr) {
          setQRCode(qr);
          consecutiveErrors = 0;
          console.log('[QR Polling] QR updated');
        }
        
        // Refresh every 5 seconds to catch new QR codes
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error: any) {
        consecutiveErrors++;
        console.log('[QR Polling] Error:', error.response?.status, 'count:', consecutiveErrors);
        
        if (consecutiveErrors >= maxErrors) {
          console.log('[QR Polling] Too many errors, stopping');
          qrPollingRef.current = false;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log('[QR Polling] Stopped');
  };
  
  const stopQRPolling = () => {
    console.log('[QR Polling] Stop requested');
    qrPollingRef.current = false;
  };

  const fetchQRCode = async (sessionId: string, retries = 15) => {
    try {
      console.log('[Fetch QR] Session ID:', sessionId, 'Retries left:', retries);
      
      const { data } = await sessionsAPI.getQR(sessionId);
      console.log('[Fetch QR] Response:', data);
      
      // Backend returns data.qr, not data.qrCode
      const qr = data?.data?.qr || data?.qr || data?.data?.qrCode;
      
      console.log('[Fetch QR] Extracted QR:', qr ? `${qr.substring(0, 50)}...` : 'NULL');
      
      if (qr) {
        setQRCode(qr);
        console.log('[Fetch QR] QR code set successfully');
        // Start continuous polling to refresh QR
        startQRPolling(sessionId);
        return; // Stop retry - QR obtained successfully
      } else if (retries > 0) {
        // QR code not ready yet, retry after 2 seconds
        console.log('[Fetch QR] QR not ready, retrying in 2s...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchQRCode(sessionId, retries - 1);
      } else {
        console.error('[Fetch QR] No QR code after all retries');
        toast.error('QR code not available. Session may need to be reconnected first.');
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || error.message;
      console.log('[Fetch QR] Error:', errorMessage);
      
      if (error.response?.status === 404 && retries > 0) {
        // QR not available - keep retrying
        console.log('[Fetch QR] 404 error, retrying in 2s... (retries left:', retries - 1, ')');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchQRCode(sessionId, retries - 1);
      } else if (retries <= 0) {
        toast.error('QR code not available. Click Reconnect to generate new QR code.');
      }
    }
  };

  // Handle QR button click - always reconnect if not connected
  const handleShowQR = async (session: any) => {
    console.log('[handleShowQR] Session:', session.id, 'Status:', session.status);
    setSelectedSession(session);
    setQRCode(null);
    setShowQRModal(true);
    
    // Check if session needs reconnection or just QR fetch
    const needsReconnect = session.status !== 'connected' && session.status !== 'connecting' && session.status !== 'qr';
    console.log('[handleShowQR] Needs reconnect:', needsReconnect);
    
    if (needsReconnect) {
      toast.loading('Reconnecting session...', { id: 'qr-reconnect' });
      try {
        console.log('[handleShowQR] Calling reconnect API...');
        const reconnectResult = await sessionsAPI.reconnect(session.id);
        console.log('[handleShowQR] Reconnect API result:', reconnectResult);
        toast.success('Generating QR code...', { id: 'qr-reconnect' });
        
        // Start polling for QR with longer delay and more retries
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchQRCode(session.id, 15); // 15 retries = 30 seconds max
        pollSessionStatus(session.id);
      } catch (e: any) {
        console.log('[handleShowQR] Reconnect error:', e?.response?.status, e?.response?.data);
        const msg = e.response?.data?.message || 'Failed to reconnect';
        if (msg.includes('already connected')) {
          toast.success('Session already connected!', { id: 'qr-reconnect' });
          setShowQRModal(false);
          fetchSessions();
        } else if (msg.includes('already reconnecting')) {
          // Session is already reconnecting, just fetch QR
          toast.success('Session reconnecting, fetching QR...', { id: 'qr-reconnect' });
          await new Promise(resolve => setTimeout(resolve, 1000));
          await fetchQRCode(session.id, 15);
          pollSessionStatus(session.id);
        } else {
          toast.dismiss('qr-reconnect');
          // Don't show error - just fetch QR anyway
          await new Promise(resolve => setTimeout(resolve, 2000));
          await fetchQRCode(session.id, 10);
          pollSessionStatus(session.id);
        }
      }
    } else {
      // Session is connecting/qr, just fetch QR
      console.log('[handleShowQR] Just fetching QR...');
      toast.success('Fetching QR code...', { id: 'qr-reconnect' });
      await fetchQRCode(session.id, 10);
      pollSessionStatus(session.id);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await sessionsAPI.delete(sessionId);
      toast.success('Session deleted');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const handleReconnect = async (session: any) => {
    // First check if already connected - no need to reconnect
    if (session.status === 'connected') {
      toast.success('Session is already connected!');
      return;
    }
    
    try {
      toast.loading('Reconnecting...', { id: 'reconnect' });
      
      try {
        await sessionsAPI.reconnect(session.id);
        console.log('[handleReconnect] Reconnect API called successfully');
      } catch (reconnectError: any) {
        const msg = reconnectError.response?.data?.message || '';
        console.log('[handleReconnect] Reconnect error:', msg);
        
        if (msg.includes('already connected')) {
          toast.success('Session connected!', { id: 'reconnect' });
          fetchSessions();
          return;
        }
        // Other errors - continue to check status
      }
      
      // Start polling for connection status
      pollSessionStatus(session.id);
      
      // Wait a bit to see if it connects automatically (credentials still valid)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh session to check current status
      try {
        const { data } = await sessionsAPI.get(session.id);
        const currentStatus = data?.data?.status || data?.status;
        console.log('[handleReconnect] Current status after wait:', currentStatus);
        
        if (currentStatus === 'connected') {
          // Connected automatically - no QR needed!
          toast.success('Session connected successfully!', { id: 'reconnect' });
          fetchSessions();
          return;
        } else {
          // Any other status - show QR modal and try to get QR
          console.log('[handleReconnect] Showing QR modal for status:', currentStatus);
          toast.success('Scan QR code to connect', { id: 'reconnect' });
          setSelectedSession(session);
          setQRCode(null);
          setShowQRModal(true);
          
          // Keep trying to get QR with longer delay (backend may still be generating)
          await fetchQRCode(session.id, 15); // 15 retries = 30 seconds
        }
      } catch (statusError) {
        console.log('[handleReconnect] Status check error, showing QR modal anyway');
        // Even if status check fails, show QR modal
        toast.success('Scan QR code to connect', { id: 'reconnect' });
        setSelectedSession(session);
        setQRCode(null);
        setShowQRModal(true);
        await fetchQRCode(session.id, 15);
      }
    } catch (error: any) {
      console.log('[handleReconnect] Unexpected error:', error);
      toast.dismiss('reconnect');
      fetchSessions();
    }
  };

  const handleDisconnect = async (sessionId: string) => {
    if (!confirm('Are you sure you want to disconnect this session?')) return;

    try {
      await sessionsAPI.disconnect(sessionId);
      toast.success('Session disconnected');
      fetchSessions();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to disconnect';
      toast.error(message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-700';
      case 'connecting':
      case 'pairing':
        return 'bg-yellow-100 text-yellow-700';
      case 'disconnected':
        return 'bg-gray-100 text-gray-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Sessions</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp connections</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Session
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
          <p className="text-gray-600 mb-4">Create your first WhatsApp session to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session: any) => (
            <div key={session.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{session.name}</h3>
                  <p className="text-sm text-gray-500 truncate">
                    {session.phone_number || session.phoneNumber || 'No phone number'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400 truncate">
                      ID: {session.session_id?.substring(0, 20) || session.id?.substring(0, 20)}...
                    </p>
                    <button
                      onClick={() => {
                        const id = session.session_id || session.id;
                        // Fallback method for HTTP (non-HTTPS)
                        const textArea = document.createElement('textarea');
                        textArea.value = id;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          toast.success('Session ID copied!');
                        } catch (err) {
                          toast.error('Failed to copy. ID: ' + id.substring(0, 30) + '...');
                        }
                        document.body.removeChild(textArea);
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition"
                      title="Copy full Session ID"
                    >
                      <Copy className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ml-2 ${getStatusColor(session.status)}`}>
                  {session.status}
                </span>
              </div>

              {/* Session Info */}
              <div className="text-xs text-gray-500 mb-4 space-y-1">
                {session.last_connected_at && (
                  <p>Last connected: {new Date(session.last_connected_at).toLocaleString()}</p>
                )}
                <p>Created: {new Date(session.createdAt || session.created_at).toLocaleDateString()}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Show Reconnect for non-connected sessions */}
                {session.status !== 'connected' && (
                  <button
                    onClick={() => handleReconnect(session)}
                    className="flex-1 flex items-center justify-center px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm"
                    title="Reconnect Session"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reconnect
                  </button>
                )}

                {/* Show Disconnect for connected sessions */}
                {session.status === 'connected' && (
                  <button
                    onClick={() => handleDisconnect(session.id)}
                    className="flex-1 flex items-center justify-center px-3 py-2 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition text-sm"
                    title="Disconnect Session"
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    Disconnect
                  </button>
                )}

                {/* Delete button always visible */}
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="flex items-center justify-center px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm"
                  title="Delete Session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="My WhatsApp Account"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (optional)
                </label>
                <input
                  type="text"
                  value={newSession.phone_number}
                  onChange={(e) => setNewSession({ ...newSession, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  placeholder="+62821234567890"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For pairing code method (alternative to QR)
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="use_pairing"
                  checked={newSession.use_pairing}
                  onChange={(e) => setNewSession({ ...newSession, use_pairing: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="use_pairing" className="ml-2 block text-sm text-gray-700">
                  Use pairing code (requires phone number)
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan QR Code</h2>
            <p className="text-gray-600 mb-4">Scan this code with WhatsApp to connect</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ⚡ <strong>Scan quickly!</strong> QR code refreshes every ~20 seconds. 
                Open WhatsApp → Settings → Linked Devices → Link a Device
              </p>
            </div>
            {qrCode ? (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <img src={qrCode} alt="QR Code" className="w-full" />
                <p className="text-xs text-center text-gray-400 mt-2">QR auto-refreshes every 5 seconds</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-500">Generating QR Code...</p>
              </div>
            )}
            <button
              onClick={() => {
                stopQRPolling(); // Stop QR polling when closing modal
                setShowQRModal(false);
                fetchSessions();
              }}
              className="w-full mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
