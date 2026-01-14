# 🔧 FIX: Message Body Kosong (Empty Message Content)

## Tanggal: 14 Januari 2026

## Problem Summary

Dari laporan di `PERTANYAAN_MASALAH_MESSAGES_KOSONG.txt`:
- **89.58%** messages memiliki body kosong
- **Semua** incoming messages (fromMe: false) body kosong
- Hanya outgoing messages yang baru dikirim yang berhasil ter-extract

---

## 🔍 Root Cause Analysis

### Masalah #1: getMessage Handler Kosong
```javascript
// BEFORE (BROKEN)
getMessage: async (key) => {
  return { conversation: '' };  // SELALU RETURN KOSONG!
}
```

**Impact:** Baileys memanggil `getMessage` untuk:
- Decrypt messages dari Signal protocol
- Load history messages
- Reply/quote messages

Karena selalu return kosong, WhatsApp tidak bisa decrypt message content dari history!

### Masalah #2: Tidak Ada History Sync Handler
API tidak menangkap event `messaging-history.set` yang dikirim WhatsApp saat session connect untuk sync chat history.

### Masalah #3: syncFullHistory Tidak Diaktifkan
Option `syncFullHistory: true` tidak diset di Baileys socket, sehingga history sync tidak lengkap.

---

## ✅ Solutions Implemented

### Fix 1: Proper getMessage Implementation
```javascript
// AFTER (FIXED)
getMessage: async (key) => {
  try {
    const storedMsg = await db.Message.findOne({
      where: { message_id: key.id },
      attributes: ['content', 'type', 'metadata']
    });
    
    if (storedMsg) {
      // Return raw message if available
      if (storedMsg.metadata?.raw_message) {
        return storedMsg.metadata.raw_message;
      }
      if (storedMsg.content) {
        return { conversation: storedMsg.content };
      }
    }
    
    return undefined; // Let Baileys know message not found
  } catch (e) {
    return undefined;
  }
}
```

### Fix 2: Enable Full History Sync
```javascript
sock = makeWASocket({
  // ... other options
  syncFullHistory: true,  // NEW: Enable full history sync
  getMessage: async (key) => { /* ... */ }
});
```

### Fix 3: Handle History Sync Event
```javascript
sock.ev.on('messaging-history.set', async ({ messages, chats, isLatest }) => {
  await this.handleHistorySync(sessionId, messages, chats, sessionRecord);
});
```

New method `handleHistorySync`:
- Imports messages from history in batches (100 per batch)
- Stores raw message in metadata for future getMessage calls
- Creates/updates Chat records for persistent chat list
- Triggers `history.synced` webhook when complete

### Fix 4: Store Raw Message in Metadata
```javascript
const messageData = {
  // ... other fields
  metadata: {
    raw_message: msg.message,  // CRITICAL: Store for getMessage
    push_name: msg.pushName,
    is_history: true
  }
};
```

---

## 🆕 New API Endpoints

### 1. Get Sync Status
```
GET /api/v1/sessions/:sessionId/sync-status
```

Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "connected",
    "sync": {
      "totalMessages": 500,
      "outgoingMessages": 150,
      "incomingMessages": 350,
      "messagesWithContent": 480,
      "messagesWithoutContent": 20,
      "historyMessages": 450,
      "uniqueChats": 25,
      "contentPercentage": 96,
      "dateRange": {
        "oldest": "2025-12-01T...",
        "newest": "2026-01-14T..."
      }
    },
    "recommendations": []
  }
}
```

### 2. Resync History
```
POST /api/v1/sessions/:sessionId/resync-history
```

This will:
1. Disconnect the session
2. Reconnect to trigger fresh history sync
3. Import all messages from WhatsApp history

Response:
```json
{
  "success": true,
  "message": "History re-sync initiated. Messages will be imported in the background.",
  "data": {
    "sessionId": "uuid",
    "status": "resyncing"
  }
}
```

---

## 🔄 New Webhook Events

### history.synced
Triggered when history sync completes.

```json
{
  "event": "history.synced",
  "data": {
    "messagesImported": 450,
    "chatsImported": 25,
    "errors": 0,
    "durationMs": 5234
  }
}
```

---

## 📋 How to Fix Existing Sessions

### Step 1: Deploy Update
```bash
cd /var/www/whatsapp-api
git pull
docker compose build app
docker compose up -d app
```

### Step 2: Resync Each Session
For each connected session, call:
```bash
curl -X POST "http://YOUR_API/api/v1/sessions/{sessionId}/resync-history" \
  -H "X-API-Key: YOUR_API_KEY"
```

Or via dashboard, click "Resync History" button.

### Step 3: Monitor Sync Status
```bash
curl "http://YOUR_API/api/v1/sessions/{sessionId}/sync-status" \
  -H "X-API-Key: YOUR_API_KEY"
```

Expected after resync:
- `contentPercentage` should be 90%+
- `historyMessages` should show synced count
- `messagesWithoutContent` should be minimal

---

## ⚠️ Important Notes

### Why Some Messages May Still Be Empty

1. **Deleted Messages**: Messages deleted in WhatsApp will have empty content
2. **Media Without Caption**: Images/videos without text have empty body (this is correct)
3. **System Messages**: Protocol messages (encryption notifications, etc)
4. **E2E Encryption**: Some very old messages may not be decryptable

### Expected Content Percentage
- **90-95%**: Normal for text-heavy chats
- **70-85%**: Normal for media-heavy chats
- **Below 50%**: May need resync or there's an issue

### History Sync Limitations
- WhatsApp syncs approximately **last 3 months** of messages
- Very old messages may not be available
- Group messages depend on group settings
- Some messages may fail to decrypt if keys are missing

---

## 🔍 Debugging

### Check if History Sync Ran
Look for log messages:
```
[sessionId] History sync: X messages, Y chats, isLatest: true
[sessionId] History sync completed: X messages, Y chats in Zms
```

### Check Raw Message Storage
```sql
SELECT message_id, content, 
       JSON_EXTRACT(metadata, '$.is_history') as is_history,
       JSON_EXTRACT(metadata, '$.raw_message') IS NOT NULL as has_raw
FROM messages 
WHERE session_id = 'YOUR_SESSION_ID'
LIMIT 10;
```

### Force Full Resync
If automatic resync doesn't work:
1. Delete the session folder in `/sessions/{session_id}/`
2. Delete messages from database for that session
3. Reconnect session (scan QR again)
4. Wait for history sync to complete

---

## Files Modified

1. `src/services/whatsappService.js`
   - Fixed `getMessage` callback
   - Added `syncFullHistory: true`
   - Added `messaging-history.set` event handler
   - Added `handleHistorySync` method
   - Added `handleChatUpdates` method
   - Added `handleNewChats` method
   - Added `resyncHistory` method
   - Added `loadMoreMessages` method

2. `src/controllers/sessionController.js`
   - Added `resyncHistory` endpoint
   - Added `getSyncStatus` endpoint

3. `src/routes/sessions.js`
   - Added routes for new endpoints

---

## Testing Checklist

After deployment:
- [ ] Create new session → should trigger history sync
- [ ] Check sync status → contentPercentage should be high
- [ ] Get messages → body should be filled
- [ ] Resync history → should reimport messages
- [ ] Webhook → should receive history.synced event
