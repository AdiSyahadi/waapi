# 📚 ANALISIS MENDALAM: PENGELOLAAN SESSION WHATSAPP API

**Dokumentasi Komprehensif - Januari 2026**

---

## 🎯 TABLE OF CONTENTS

1. [Arsitektur System](#1-arsitektur-system)
2. [Lifecycle Session](#2-lifecycle-session)
3. [Database Schema](#3-database-schema)
4. [Flow Create Session](#4-flow-create-session)
5. [Status Session States](#5-status-session-states)
6. [Webhook Integration](#6-webhook-integration)
7. [Error Handling](#7-error-handling)
8. [Reconnection Logic](#8-reconnection-logic)
9. [Memory vs Database](#9-memory-vs-database)
10. [Common Issues & Solutions](#10-common-issues--solutions)

---

## 1. ARSITEKTUR SYSTEM

### 1.1 Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT APP                           │
│                   (Laravel CRM / Frontend)                   │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP Requests (API Key)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS API                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  authOrApiKey.js → sessionController.js              │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                   WHATSAPP SERVICE                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  sessions: Map<sessionId, SessionObject>             │  │
│  │  - socket: WASocket (Baileys)                        │  │
│  │  - sessionRecord: Database record                    │  │
│  │  - qrRetries: number                                 │  │
│  │  - isConnecting: boolean                             │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────┬────────────────────┬─────────────────────────────┘
           │                    │
           ↓                    ↓
┌──────────────────┐   ┌──────────────────────────────────────┐
│  BAILEYS LIBRARY │   │        MYSQL DATABASE                │
│  (WhatsApp Web)  │   │  ┌────────────────────────────────┐ │
│  - QR Generation │   │  │  sessions table                │ │
│  - Authentication│   │  │  - id (UUID)                   │ │
│  - Message Send  │   │  │  - session_id (user_id_time)  │ │
│  - Event Emit    │   │  │  - status (enum)              │ │
└──────────────────┘   │  │  - webhook_url (string)       │ │
                       │  │  - qr_code (text)             │ │
                       │  └────────────────────────────────┘ │
                       └──────────────────────────────────────┘
                                   │
                                   ↓
                       ┌──────────────────────────────────────┐
                       │   FILESYSTEM (Auth State)            │
                       │   sessions/{sessionId}/              │
                       │   - creds.json                       │
                       │   - app-state-sync-*                 │
                       └──────────────────────────────────────┘
```

### 1.2 Key Components

**1. sessionController.js** (API Layer)
- Handles HTTP requests from clients
- Validates input data
- Orchestrates session operations
- Returns HTTP responses

**2. whatsappService.js** (Business Logic)
- Manages in-memory session Map
- Interfaces with Baileys library
- Handles WhatsApp connection lifecycle
- Emits webhooks for events

**3. Database (MySQL)**
- Persists session metadata
- Stores QR codes temporarily
- Tracks reconnection attempts
- Logs connection history

**4. Filesystem (sessions/)**
- Stores WhatsApp authentication credentials
- Maintains session state between restarts
- Enables session persistence

---

## 2. LIFECYCLE SESSION

### 2.1 Complete Lifecycle Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    SESSION LIFECYCLE                          │
└──────────────────────────────────────────────────────────────┘

START: Client calls POST /api/v1/sessions
│
├─ STEP 1: Controller receives request
│  └─ Validates: name, webhook_url, webhook_events
│
├─ STEP 2: Generate sessionId
│  └─ Format: {user_id}_{timestamp}
│  └─ Example: 266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768191349886
│
├─ STEP 3: Create database record
│  └─ INSERT INTO sessions (id, session_id, user_id, name, ...)
│  └─ Status: 'connecting' (initial status)
│
├─ STEP 4: Initialize WhatsApp connection (NON-BLOCKING)
│  ├─ whatsappService.createSession(sessionId, sessionRecord)
│  ├─ Load auth state from filesystem (sessions/{sessionId}/)
│  ├─ Create WASocket (Baileys)
│  ├─ Store in memory Map: sessions.set(sessionId, {...})
│  └─ Setup event handlers
│
├─ STEP 5: Event handlers waiting for WhatsApp events
│  │
│  ├─ EVENT: 'connection.update' with QR
│  │  ├─ Generate QR code image (base64 PNG)
│  │  ├─ Update DB: status='qr', qr_code='data:image/png;base64...'
│  │  ├─ Increment reconnect_attempts
│  │  └─ Trigger webhook: 'qr.generated' (if webhook_url exists)
│  │
│  ├─ EVENT: 'connection.update' with connection='open'
│  │  ├─ Extract phone number from sock.user.id
│  │  ├─ Update DB: status='connected', phone_number='628...'
│  │  ├─ Clear qr_code field
│  │  ├─ Set last_connected_at = NOW()
│  │  ├─ Reset reconnect_attempts = 0
│  │  └─ Trigger webhook: 'session.connected' ✅
│  │
│  ├─ EVENT: 'connection.update' with connection='close'
│  │  ├─ Extract disconnect reason (statusCode)
│  │  ├─ Check if should reconnect (not loggedOut)
│  │  ├─ Update DB: status='disconnected' OR 'failed'
│  │  ├─ Set last_disconnected_at = NOW()
│  │  ├─ Remove from memory Map
│  │  ├─ Trigger webhook: 'session.disconnected'
│  │  └─ IF auto_reconnect AND attempts < MAX_ATTEMPTS
│  │     └─ Schedule reconnect after 5 seconds
│  │
│  ├─ EVENT: 'messages.upsert'
│  │  ├─ Save message to database
│  │  ├─ Log: message_received
│  │  └─ Trigger webhook: 'message.received'
│  │
│  └─ EVENT: 'creds.update'
│     └─ Save credentials to filesystem
│
└─ END: Session persists until explicitly deleted or fails permanently
```

### 2.2 State Transitions

```
[connecting] ──QR generated──> [qr] ──Scanned──> [connected]
     │                           │                     │
     │                           │                     │
     └──Error──┐                 └──Error──┐           └──Disconnect──> [disconnected]
                │                          │                               │
                ↓                          ↓                               │
             [failed] <───────────────────────────────────────────────────┘
                                                                           │
                                                         Auto-reconnect?   │
                                                              Yes ─────────┘
                                                              No ──> [failed]
```

---

## 3. DATABASE SCHEMA

### 3.1 sessions Table Structure

```sql
CREATE TABLE sessions (
  -- Primary Keys
  id VARCHAR(36) PRIMARY KEY,              -- UUID (a2649a4f-cb3c-4228-9065-9f2b8b808b96)
  session_id VARCHAR(255) UNIQUE NOT NULL, -- user_id_timestamp (266cdcce-..._1768191349886)
  
  -- Relationships
  user_id VARCHAR(36) NOT NULL,            -- FK to users.id
  organization_id VARCHAR(36),              -- FK to organizations.id
  
  -- Session Info
  name VARCHAR(255) NOT NULL,               -- "adi test", "production-wa"
  phone_number VARCHAR(20),                 -- "6282119499306" (after connected)
  
  -- Authentication
  qr_code TEXT,                             -- "data:image/png;base64,iVBOR..."
  pairing_code VARCHAR(8),                  -- "ABCD-1234" (for pairing method)
  auth_state LONGTEXT,                      -- Serialized auth (if needed)
  
  -- Status & Connection
  status ENUM('connecting', 'connected', 'disconnected', 'qr', 'pairing', 'failed'),
  last_connected_at DATETIME,               -- Last successful connection
  last_disconnected_at DATETIME,            -- Last disconnect
  reconnect_attempts INT DEFAULT 0,         -- Current reconnection count
  auto_reconnect BOOLEAN DEFAULT TRUE,      -- Enable auto-reconnect?
  
  -- Webhook Config
  webhook_url VARCHAR(255),                 -- "https://example.com/webhook"
  webhook_events JSON,                      -- ["*"] or ["message.*", "connection.*"]
  webhook_secret VARCHAR(255),              -- HMAC secret for signature
  
  -- Metadata
  settings JSON,                            -- Custom settings
  metadata JSON,                            -- Extra data
  
  -- Timestamps
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_session_id (session_id),
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
);
```

### 3.2 Field Explanations

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| **id** | UUID | Database primary key, used in API endpoints | `a2649a4f-cb3c-4228-9065-9f2b8b808b96` |
| **session_id** | String | WhatsApp session identifier, used for messaging | `266cdcce-..._1768191349886` |
| **status** | Enum | Current connection state | `connected`, `qr`, `failed` |
| **qr_code** | Text | Base64 PNG image, cleared after connection | `data:image/png;base64,iVB...` |
| **webhook_url** | String | ⚠️ **CRITICAL**: Must be set during creation | `https://ngrok.io/webhook` |
| **webhook_events** | JSON Array | Event filters, `["*"]` = all events | `["connection.*", "message.*"]` |
| **phone_number** | String | Populated after QR scan, extracted from `sock.user.id` | `6282119499306` |
| **reconnect_attempts** | Integer | Auto-incremented, reset to 0 on success | `0` to `5` (max) |
| **auto_reconnect** | Boolean | Enable automatic reconnection on disconnect | `true` |

---

## 4. FLOW CREATE SESSION

### 4.1 API Request

```http
POST /api/v1/sessions HTTP/1.1
Host: 72.62.125.132
X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3
Content-Type: application/json

{
  "name": "production-session",
  "webhook_url": "https://8a5fa0c560ec.ngrok-free.app/api/webhook/whatsapp",
  "webhook_events": ["connection.*", "message.*"],
  "auto_reconnect": true
}
```

### 4.2 Controller Processing (sessionController.js:8-85)

```javascript
// STEP 1: Validate input
const { name, webhook_url, webhook_events, auto_reconnect = true } = req.body;
if (!name) {
  return res.status(400).json({ success: false, message: 'Session name is required' });
}

// STEP 2: Generate unique session ID
const sessionId = `${req.user.id}_${Date.now()}`;
// Example: "266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768191349886"

// STEP 3: Create database record
const session = await db.Session.create({
  session_id: sessionId,
  user_id: req.user.id,
  organization_id: req.user.organization_id,
  name,
  webhook_url,                        // ⚠️ CRITICAL: Store webhook URL
  webhook_events: webhook_events || ['*'],
  auto_reconnect,
  status: 'connecting'                // Initial status
});

// STEP 4: Initialize WhatsApp connection (NON-BLOCKING)
whatsappService.createSession(sessionId, session).catch(error => {
  console.error(`Session initialization failed for ${sessionId}:`, error);
  session.update({ status: 'failed' }).catch(() => {});
});

// STEP 5: Return response immediately (don't wait for QR)
res.status(201).json({
  success: true,
  message: 'Session created successfully',
  data: {
    session: session.toJSON()
  }
});
```

### 4.3 Service Layer (whatsappService.js:47-149)

```javascript
async createSession(sessionId, sessionRecord, usePairing = false, phoneNumber = null) {
  try {
    // VALIDATION: Check if session already exists in memory
    if (this.sessions.has(sessionId)) {
      throw new Error('Session already exists');
    }

    // STEP 1: Get auth path from filesystem
    const authPath = this.getAuthPath(sessionId);
    // Returns: /path/to/project/sessions/{sessionId}/
    
    // STEP 2: Load auth state (credentials)
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    // This reads creds.json and app-state-sync-* files
    
    // STEP 3: Create Baileys WASocket
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,        // Don't print to console
      logger: this.createBaileysLogger(), // Silent logger
      browser: ['WhatsApp API', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,         // 60 second timeout
      keepAliveIntervalMs: 30000,      // Keep alive every 30s
      defaultQueryTimeoutMs: 60000,
      getMessage: async (key) => {
        // Return empty message for protocol
        return { conversation: '' };
      }
    });
    
    // STEP 4: Store in memory Map
    this.sessions.set(sessionId, {
      socket: sock,                    // WASocket instance
      sessionRecord,                   // Database model instance
      qrRetries: 0,                    // QR generation counter
      isConnecting: true,              // Connection flag
      usePairing,                      // Pairing code method?
      phoneNumber                      // Phone for pairing
    });
    
    // STEP 5: Setup event handlers
    this.setupEventHandlers(sessionId, sock, saveCreds, sessionRecord);
    
    // STEP 6: If using pairing code, request it
    if (usePairing && phoneNumber) {
      this.requestPairingCode(sessionId, sock, phoneNumber, sessionRecord).catch(err => {
        logger.error(`Pairing code request failed for ${sessionId}:`, err);
      });
    }
    
    return sock;
  } catch (error) {
    // CLEANUP on failure
    if (sock) sock.end();
    this.sessions.delete(sessionId);
    await sessionRecord.update({ status: 'failed' });
    throw error;
  }
}
```

### 4.4 Event Handler Setup (whatsappService.js:193-230)

```javascript
setupEventHandlers(sessionId, sock, saveCreds, sessionRecord) {
  // EVENT 1: Connection updates (QR, open, close)
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      // QR code received from WhatsApp
      await this.handleQRCode(sessionId, qr, sessionRecord);
    }
    
    if (connection === 'close') {
      // Connection lost
      await this.handleDisconnection(sessionId, lastDisconnect, sessionRecord);
    } else if (connection === 'open') {
      // Successfully connected!
      await this.handleConnection(sessionId, sock, sessionRecord);
    }
  });
  
  // EVENT 2: Credentials update (save to filesystem)
  sock.ev.on('creds.update', async () => {
    await saveCreds();
  });
  
  // EVENT 3: Incoming messages
  sock.ev.on('messages.upsert', async (m) => {
    await this.handleMessages(sessionId, m, sessionRecord);
  });
  
  // EVENT 4: Message status updates (read, delivered)
  sock.ev.on('messages.update', async (updates) => {
    await this.handleMessageUpdates(sessionId, updates, sessionRecord);
  });
}
```

---

## 5. STATUS SESSION STATES

### 5.1 Status Enum Values

```javascript
// src/models/session.js:44-49
status: {
  type: DataTypes.ENUM(
    'connecting',   // Initial state, waiting for QR or connection
    'connected',    // Successfully connected to WhatsApp
    'disconnected', // Temporarily disconnected (can reconnect)
    'qr',           // QR code generated, waiting for scan
    'pairing',      // Pairing code generated, waiting for entry
    'failed'        // Permanently failed (max retries or logged out)
  ),
  defaultValue: 'connecting'
}
```

### 5.2 Status Transition Logic

#### **5.2.1 CONNECTING → QR**

```javascript
// whatsappService.js:236-261
async handleQRCode(sessionId, qr, sessionRecord) {
  // Convert QR string to base64 PNG image
  const qrDataUrl = await QRCode.toDataURL(qr, {
    width: 256,
    margin: 2
  });
  
  // Update database
  await sessionRecord.update({
    qr_code: qrDataUrl,                    // Store QR image
    status: 'qr',                          // ✅ Status change
    reconnect_attempts: (this.sessions.get(sessionId)?.qrRetries || 0) + 1
  });
  
  // Increment in-memory counter
  if (this.sessions.has(sessionId)) {
    this.sessions.get(sessionId).qrRetries += 1;
  }
  
  // Trigger webhook (if webhook_url exists)
  this.triggerWebhook(sessionRecord, 'qr.generated', { qr: qrDataUrl });
}
```

#### **5.2.2 QR → CONNECTED**

```javascript
// whatsappService.js:267-296
async handleConnection(sessionId, sock, sessionRecord) {
  const user = sock.user; // { id: "6282119499306:27@s.whatsapp.net", name: "..." }
  
  // Update database
  await sessionRecord.update({
    status: 'connected',                   // ✅ Status change
    phone_number: user.id.split(':')[0],   // Extract: "6282119499306"
    qr_code: null,                         // Clear QR (no longer needed)
    last_connected_at: new Date(),         // Timestamp
    reconnect_attempts: 0                  // Reset counter
  });
  
  // Update in-memory flag
  if (this.sessions.has(sessionId)) {
    this.sessions.get(sessionId).isConnecting = false;
  }
  
  // Trigger webhook: 'session.connected' ✅
  this.triggerWebhook(sessionRecord, 'session.connected', {
    phone: user.id,
    name: user.name
  });
}
```

#### **5.2.3 CONNECTED → DISCONNECTED/FAILED**

```javascript
// whatsappService.js:302-348
async handleDisconnection(sessionId, lastDisconnect, sessionRecord) {
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
  
  // Determine new status
  const newStatus = shouldReconnect ? 'disconnected' : 'failed';
  
  // Update database
  await sessionRecord.update({
    status: newStatus,                     // ✅ Status change
    last_disconnected_at: new Date()
  });
  
  // Remove from memory
  this.sessions.delete(sessionId);
  
  // Auto-reconnect logic
  if (shouldReconnect && sessionRecord.auto_reconnect) {
    if (sessionRecord.reconnect_attempts < 5) {
      // Schedule reconnect after 5 seconds
      setTimeout(() => {
        this.reconnectSession(sessionId, sessionRecord);
      }, 5000);
    } else {
      // Max attempts reached → set to 'failed'
      await sessionRecord.update({ status: 'failed' });
    }
  }
  
  // Trigger webhook: 'session.disconnected'
  this.triggerWebhook(sessionRecord, 'session.disconnected', {
    statusCode,
    shouldReconnect,
    reason: lastDisconnect?.error?.message
  });
}
```

### 5.3 Status Meanings & Actions

| Status | Meaning | QR Code | Webhook URL | Action Required |
|--------|---------|---------|-------------|-----------------|
| **connecting** | Initial state, socket connecting | ❌ Not yet | ⚠️ Should be set | Wait for QR or connection |
| **qr** | QR code generated, awaiting scan | ✅ Available | ✅ Can trigger webhook | **Scan QR with WhatsApp app** |
| **connected** | Successfully authenticated | ❌ Cleared | ✅ Webhooks active | None, session ready |
| **disconnected** | Temporarily lost connection | ❌ Old QR invalid | ⚠️ Webhooks paused | Auto-reconnect or manual reconnect |
| **pairing** | Pairing code method, waiting for code entry | ❌ No QR | ✅ Code sent via webhook | **Enter pairing code in WhatsApp** |
| **failed** | Permanently failed (logged out or max retries) | ❌ Invalid | ❌ No webhooks | **Delete and recreate session** |

---

## 6. WEBHOOK INTEGRATION

### 6.1 Webhook Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  WHATSAPP EVENT OCCURS                       │
│  (QR generated, Connected, Message received, etc.)          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  whatsappService.triggerWebhook(sessionRecord, event, data) │
│  - Check if sessionRecord.webhook_url exists                │
│  - Check if event matches webhook_events filters            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│          webhookService.queueWebhook(...)                    │
│  - Validate webhook_url is not null                         │
│  - Match event against webhook_events array                 │
│  - Build payload with timestamp, session_id, data           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│          webhookService.sendWebhook(...)                     │
│  - Generate X-Webhook-Signature (HMAC-SHA256)              │
│  - Send HTTP POST request to webhook_url                    │
│  - Timeout: 10 seconds                                      │
│  - Log success/failure to webhook_logs table                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓ (Success 200-299)
┌─────────────────────────────────────────────────────────────┐
│              CLIENT APPLICATION RECEIVES                     │
│  POST https://client.com/webhook HTTP/1.1                   │
│  Content-Type: application/json                             │
│  X-Webhook-Signature: sha256=abc123...                      │
│                                                              │
│  {                                                           │
│    "event": "session.connected",                            │
│    "timestamp": "2026-01-12T10:30:00.000Z",                 │
│    "session_id": "266cdcce-..._1768191349886",              │
│    "data": {                                                │
│      "phone": "6282119499306",                              │
│      "name": "User Name"                                    │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Webhook URL Configuration

#### ⚠️ **CRITICAL**: webhook_url MUST be set during session creation

```javascript
// ❌ WRONG: Webhook will NOT work (webhook_url = null)
POST /api/v1/sessions
{
  "name": "test session"
}

// ✅ CORRECT: Webhook will work
POST /api/v1/sessions
{
  "name": "test session",
  "webhook_url": "https://example.com/webhook/whatsapp"
}
```

#### Webhook URL Validation (sessionController.js:11)

```javascript
// Validator checks URL format
body('webhook_url').optional().isURL().withMessage('Valid webhook URL required')
```

### 6.3 Event Filtering (webhook_events)

```javascript
// Example 1: All events
{
  "webhook_events": ["*"]
}
// Receives: qr.generated, session.connected, session.disconnected, message.received, etc.

// Example 2: Only connection events
{
  "webhook_events": ["connection.*"]
}
// Receives: session.connected, session.disconnected
// Ignores: message.received, qr.generated

// Example 3: Specific events
{
  "webhook_events": ["session.connected", "message.received"]
}
// Only these two events

// Example 4: Message patterns
{
  "webhook_events": ["message.received", "message.sent"]
}
```

### 6.4 Webhook Payload Format

#### Event: qr.generated

```json
{
  "event": "qr.generated",
  "timestamp": "2026-01-12T10:25:00.000Z",
  "session_id": "266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768191349886",
  "data": {
    "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

#### Event: session.connected

```json
{
  "event": "session.connected",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "session_id": "266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768191349886",
  "data": {
    "phone": "6282119499306:27@s.whatsapp.net",
    "name": "Adi Syahadi"
  }
}
```

#### Event: session.disconnected

```json
{
  "event": "session.disconnected",
  "timestamp": "2026-01-12T11:00:00.000Z",
  "session_id": "266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768191349886",
  "data": {
    "statusCode": 401,
    "shouldReconnect": true,
    "reason": "Connection terminated"
  }
}
```

#### Event: message.received

```json
{
  "event": "message.received",
  "timestamp": "2026-01-12T10:35:00.000Z",
  "session_id": "266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768191349886",
  "data": {
    "message": {
      "session_id": "a2649a4f-cb3c-4228-9065-9f2b8b808b96",
      "message_id": "3EB0123456789ABCDEF",
      "remote_jid": "6281234567890@s.whatsapp.net",
      "from_me": false,
      "timestamp": 1705051200,
      "type": "text",
      "content": "Hello, this is a test message!",
      "status": "delivered"
    },
    "raw": {
      "key": { ... },
      "message": { ... }
    }
  }
}
```

### 6.5 Webhook Signature Verification

**Server sends:**

```http
POST /webhook/whatsapp HTTP/1.1
Content-Type: application/json
X-Webhook-Signature: sha256=1a2b3c4d5e6f...

{ "event": "session.connected", ... }
```

**Client verification (PHP example):**

```php
$payload = file_get_contents('php://input');
$receivedSignature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE']; // "sha256=1a2b3c4d..."
$webhookSecret = 'your-webhook-secret-from-database';

// Calculate expected signature
$expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $webhookSecret);

// Verify
if (!hash_equals($expectedSignature, $receivedSignature)) {
    http_response_code(401);
    die('Invalid signature');
}

// Process webhook
$data = json_decode($payload, true);
// ...
```

### 6.6 Webhook Troubleshooting

#### Issue 1: Webhook not triggered

**Symptoms:**
- Session connects but no webhook received
- QR generated but no notification

**Root Cause:**
```javascript
// Check database
SELECT webhook_url FROM sessions WHERE id = 'your-session-id';
// Result: NULL ❌
```

**Solution:**
```javascript
// Set webhook_url during creation
POST /api/v1/sessions
{
  "name": "test",
  "webhook_url": "https://example.com/webhook" // ✅
}

// OR update existing session
PUT /api/v1/sessions/{id}
{
  "webhook_url": "https://example.com/webhook"
}
```

#### Issue 2: Webhook timeout

**Symptoms:**
- Logs show "Webhook timeout" errors
- No response from client

**Root Cause:**
```javascript
// webhookService.js timeout: 10 seconds
axios.post(webhookUrl, payload, {
  timeout: 10000 // ❌ Client taking > 10s to respond
})
```

**Solution:**
```php
// Client should respond IMMEDIATELY
Route::post('/webhook/whatsapp', function (Request $request) {
    // 1. Validate signature
    // 2. Queue for processing (don't process here!)
    dispatch(new ProcessWebhookJob($request->all()));
    
    // 3. Return 200 OK immediately
    return response()->json(['status' => 'ok']); // ✅ Fast response
});
```

#### Issue 3: Wrong event filter

**Symptoms:**
- Some webhooks received, others not
- Inconsistent webhook delivery

**Root Cause:**
```javascript
// Database: webhook_events = ["connection.*"]
// Only connection.* events will be sent
// message.received → IGNORED ❌
```

**Solution:**
```javascript
// Use wildcard for all events
{
  "webhook_events": ["*"] // ✅ Receives ALL events
}

// Or specify all needed events
{
  "webhook_events": [
    "qr.generated",
    "session.connected",
    "session.disconnected",
    "message.received",
    "message.sent"
  ]
}
```

---

## 7. ERROR HANDLING

### 7.1 Common Error Scenarios

#### Error 1: Session Already Exists

```javascript
// whatsappService.js:48-50
if (this.sessions.has(sessionId)) {
  throw new Error('Session already exists');
}
```

**Cause:** Trying to create a session with sessionId that's already in memory Map

**Solution:**
1. Check if session exists: `whatsappService.isSessionConnected(sessionId)`
2. If exists and want to recreate: first call `cleanupSession()` or `deleteSession()`

#### Error 2: QR Code Not Available

```javascript
// sessionController.js:183-187
if (!session.qr_code) {
  return res.status(404).json({
    success: false,
    message: 'QR code not available. Session may be connected or disconnected.'
  });
}
```

**Causes:**
- Session status = 'connected' → QR cleared after connection
- Session status = 'disconnected' → QR expired
- Session status = 'failed' → No active connection

**Solution:**
- If 'connected': No need for QR, session is ready
- If 'disconnected' or 'failed': Call `/reconnect` endpoint to generate new QR

#### Error 3: Session Not Found

```javascript
// sessionController.js:139-144
if (!session) {
  return res.status(404).json({
    success: false,
    message: 'Session not found'
  });
}
```

**Causes:**
- Using wrong `id` (database UUID vs session_id)
- Session deleted from database
- API Key doesn't have access (wrong user_id)

**Solution:**
```javascript
// ✅ CORRECT: Use database UUID for API endpoints
GET /api/v1/sessions/a2649a4f-cb3c-4228-9065-9f2b8b808b96

// ❌ WRONG: Using session_id for API endpoints
GET /api/v1/sessions/266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768191349886
```

#### Error 4: Max Reconnect Attempts

```javascript
// whatsappService.js:327-331
if (sessionRecord.reconnect_attempts < 5) {
  // Reconnect
} else {
  logger.warn(`Max reconnect attempts reached for ${sessionId}`);
  await sessionRecord.update({ status: 'failed' });
}
```

**Cause:** Session disconnected 5+ times and auto-reconnect failed

**Solution:**
1. Delete failed session: `DELETE /api/v1/sessions/{id}`
2. Create new session: `POST /api/v1/sessions` with fresh config
3. Scan new QR code

#### Error 5: Socket Creation Failure

```javascript
// whatsappService.js:67-75
try {
  sock = makeWASocket({ ... });
} catch (sockError) {
  logger.error(`[createSession] SOCKET CREATION ERROR:`, sockError);
  throw sockError;
}
```

**Common Causes:**
- Corrupted auth state files
- Filesystem permission error
- Baileys library version conflict

**Solution:**
```bash
# Delete auth state and recreate
rm -rf sessions/{sessionId}/
# Then create session again
```

### 7.2 Error Response Format

All API errors follow this format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error detail (dev mode only)"
}
```

**Examples:**

```json
// 400 Bad Request
{
  "success": false,
  "message": "Session name is required"
}

// 404 Not Found
{
  "success": false,
  "message": "Session not found"
}

// 500 Internal Server Error
{
  "success": false,
  "message": "Failed to create session",
  "error": "ENOENT: no such file or directory"
}
```

---

## 8. RECONNECTION LOGIC

### 8.1 Auto-Reconnect Flow

```
Session Disconnects
        │
        ├─ Check disconnect reason (statusCode)
        │
        ├─ Is statusCode === DisconnectReason.loggedOut?
        │  ├─ YES → Set status='failed', NO RECONNECT ❌
        │  └─ NO → shouldReconnect = true ✅
        │
        ├─ Check auto_reconnect setting
        │  ├─ FALSE → Set status='disconnected', END
        │  └─ TRUE → Continue
        │
        ├─ Check reconnect_attempts < MAX_RECONNECT_ATTEMPTS (5)
        │  ├─ NO → Set status='failed', END (max reached)
        │  └─ YES → Continue
        │
        ├─ Increment reconnect_attempts
        │
        ├─ Wait RECONNECT_INTERVAL (5 seconds)
        │
        └─ Call reconnectSession()
           │
           ├─ Increment reconnect_attempts in DB
           │
           └─ Call createSession() again
              └─ Loop back to event handlers
```

### 8.2 Manual Reconnect Endpoint

```http
POST /api/v1/sessions/{id}/reconnect HTTP/1.1
X-API-Key: wapi_...
Content-Type: application/json

{
  "forceNew": false  // true = delete old auth and get fresh QR
}
```

**Controller Logic:**

```javascript
// sessionController.js:215-308
async reconnectSession(req, res) {
  const { id } = req.params;
  const forceNew = req.body?.forceNew;
  
  // Find session
  const session = await db.Session.findOne({
    where: { id, user_id: req.user.id }
  });
  
  // Check if already connected in memory
  if (whatsappService.isSessionConnected(session.session_id)) {
    return res.status(400).json({
      success: false,
      message: 'Session is already connected'
    });
  }
  
  // If already reconnecting, return early
  if (session.status === 'connecting' || session.status === 'qr') {
    return res.json({
      success: true,
      message: 'Session is already reconnecting'
    });
  }
  
  // Cleanup existing socket (if any)
  await whatsappService.cleanupSession(session.session_id);
  
  // If forceNew OR failed, delete old auth state
  if (session.status === 'failed' || forceNew === true) {
    const authPath = path.join(process.cwd(), 'sessions', session.session_id);
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
    }
  }
  
  // Update status to connecting
  await session.update({ 
    status: 'connecting',
    qr_code: null
  });
  
  // Create new session
  whatsappService.createSession(session.session_id, session).catch(error => {
    session.update({ status: 'failed' }).catch(() => {});
  });
  
  res.json({
    success: true,
    message: 'Reconnection initiated'
  });
}
```

### 8.3 Reconnect vs. Create New

| Scenario | Action | Auth State | QR Code | Use Case |
|----------|--------|------------|---------|----------|
| **Reconnect** | `POST /sessions/{id}/reconnect` | Preserved | Old QR reused (if valid) | Temporary disconnect |
| **Reconnect (forceNew)** | `POST /sessions/{id}/reconnect` + `{forceNew: true}` | **Deleted** | New QR generated | Failed session, need fresh auth |
| **Create New** | `DELETE /sessions/{id}` + `POST /sessions` | Deleted | New QR | Permanent failure, fresh start |

**When to use each:**

- **Normal Reconnect**: Session disconnected due to network issue, want to restore quickly
- **Force New Reconnect**: Session failed multiple times, suspect auth corruption
- **Create New Session**: Complete reset, new phone number, or organizational change

---

## 9. MEMORY VS DATABASE

### 9.1 Two-Tier Storage System

```
┌─────────────────────────────────────────────────────────────┐
│                     IN-MEMORY (Map)                          │
│  sessions.get(sessionId) → {                                │
│    socket: WASocket,           // Live WhatsApp connection  │
│    sessionRecord: Session,     // Database model instance   │
│    qrRetries: number,          // Ephemeral counter         │
│    isConnecting: boolean       // Ephemeral flag            │
│  }                                                           │
│                                                              │
│  ✅ Pros: Fast access, live socket                          │
│  ❌ Cons: Lost on restart, not persistent                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (MySQL)                           │
│  SELECT * FROM sessions WHERE session_id = '...'            │
│  → {                                                         │
│      id: UUID,                 // Primary key               │
│      session_id: string,       // WhatsApp identifier       │
│      status: enum,             // Connection state          │
│      qr_code: text,            // Base64 image              │
│      webhook_url: string,      // Webhook config            │
│      phone_number: string,     // After connection          │
│      ...                                                     │
│    }                                                         │
│                                                              │
│  ✅ Pros: Persistent, survives restart                      │
│  ❌ Cons: Slower, no live socket                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                FILESYSTEM (sessions/{id}/)                   │
│  creds.json              // WhatsApp credentials            │
│  app-state-sync-key-*    // Encryption keys                 │
│  app-state-sync-version-* // State versions                 │
│                                                              │
│  ✅ Pros: Enables session persistence                       │
│  ❌ Cons: Must be backed up, can corrupt                    │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Synchronization Points

#### Point 1: Session Creation

```javascript
// Controller creates DB record
const session = await db.Session.create({ ... });

// Service stores in memory
this.sessions.set(sessionId, {
  socket: sock,
  sessionRecord: session  // ✅ Reference to DB record
});
```

#### Point 2: QR Code Generation

```javascript
// Service updates DB
await sessionRecord.update({
  qr_code: qrDataUrl,
  status: 'qr'
});

// Service updates memory
this.sessions.get(sessionId).qrRetries += 1;
```

#### Point 3: Connection Success

```javascript
// Service updates DB
await sessionRecord.update({
  status: 'connected',
  phone_number: user.id.split(':')[0]
});

// Service updates memory
this.sessions.get(sessionId).isConnecting = false;
```

#### Point 4: Disconnection

```javascript
// Service updates DB
await sessionRecord.update({
  status: 'disconnected',
  last_disconnected_at: new Date()
});

// Service removes from memory
this.sessions.delete(sessionId);  // ⚠️ No longer in Map
```

### 9.3 Data Inconsistencies

#### Issue: Memory says "connected", DB says "failed"

**Scenario:**
```javascript
// Memory check
whatsappService.isSessionConnected(sessionId) // → true ✅

// Database check
SELECT status FROM sessions WHERE session_id = '...' // → 'failed' ❌
```

**Root Cause:**
- Server restart without cleanup
- Database updated manually
- Race condition during disconnect

**Solution:**
```javascript
// ALWAYS check both sources
const getSessionStatus = async (sessionId) => {
  const inMemory = whatsappService.isSessionConnected(sessionId);
  const inDatabase = await db.Session.findOne({ where: { session_id: sessionId } });
  
  // Memory is source of truth for "connected"
  if (inMemory) return 'connected';
  
  // Otherwise use database status
  return inDatabase.status;
};
```

#### Issue: QR code in DB but socket not in memory

**Scenario:**
```sql
SELECT qr_code, status FROM sessions WHERE id = '...';
-- qr_code: "data:image/png;base64,..."  ✅
-- status: "qr" ✅
```

```javascript
whatsappService.sessions.has(sessionId)  // → false ❌
```

**Root Cause:**
- Server restarted after QR generation
- Session initialization failed silently

**Solution:**
1. Check memory first: `sessions.has(sessionId)`
2. If not in memory but status = 'qr' → Call reconnect
3. Server should auto-restore sessions on startup (feature to implement)

---

## 10. COMMON ISSUES & SOLUTIONS

### Issue 1: "Session not found" when getting QR

**Symptoms:**
```http
GET /api/v1/sessions/266cdcce-..._1768191349886/qr
→ 404 Not Found: "Session not found"
```

**Root Cause:**
Using `session_id` (composite ID) instead of `id` (UUID)

**Solution:**
```javascript
// ❌ WRONG
GET /api/v1/sessions/266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768191349886/qr

// ✅ CORRECT (use database UUID)
GET /api/v1/sessions/a2649a4f-cb3c-4228-9065-9f2b8b808b96/qr
```

**How to get correct ID:**
```http
GET /api/v1/sessions
→ Response includes "id" field (use this for API calls)
```

---

### Issue 2: Webhook not triggering

**Symptoms:**
- Session connects successfully
- No webhook POST received at client

**Root Cause:**
```sql
SELECT webhook_url FROM sessions WHERE id = '...';
-- Result: NULL ❌
```

**Solution:**
```javascript
// Delete and recreate with webhook_url
DELETE /api/v1/sessions/{id}

POST /api/v1/sessions
{
  "name": "production-session",
  "webhook_url": "https://example.com/webhook/whatsapp",  // ✅ REQUIRED
  "webhook_events": ["*"]
}
```

---

### Issue 3: Status "failed" after reconnect attempts

**Symptoms:**
```sql
SELECT status, reconnect_attempts FROM sessions WHERE id = '...';
-- status: "failed"
-- reconnect_attempts: 6
```

**Root Cause:**
Max reconnect attempts (5) exceeded due to persistent error

**Solution:**
```javascript
// Step 1: Delete failed session
DELETE /api/v1/sessions/{id}

// Step 2: Create fresh session
POST /api/v1/sessions
{
  "name": "new-session",
  "webhook_url": "...",
  "webhook_events": ["*"]
}

// Step 3: Get QR and scan immediately (within 60 seconds)
GET /api/v1/sessions/{new_id}/qr
```

---

### Issue 4: QR code expired/invalid

**Symptoms:**
- Scan QR code but nothing happens
- WhatsApp shows "Invalid QR code"

**Root Cause:**
QR code timeout (WhatsApp QR expires after ~60 seconds)

**Solution:**
```javascript
// Force new QR generation
POST /api/v1/sessions/{id}/reconnect
{
  "forceNew": true  // ✅ Deletes old auth, generates new QR
}

// Wait 2-3 seconds, then get fresh QR
GET /api/v1/sessions/{id}/qr
→ New QR will be returned
```

---

### Issue 5: Dashboard shows "connected" but app shows "disconnected"

**Symptoms:**
- Dashboard UI: ✅ Connected
- Client app: ❌ Disconnected/Connecting

**Root Cause:**
Dashboard caching or checking memory, but DB has different status

**Solution:**
```javascript
// Check actual database status (source of truth)
GET /api/v1/sessions/{id}

// Response includes:
{
  "data": {
    "session": {
      "status": "failed",  // ← Actual status
      ...
    },
    "connected": false  // ← Memory status
  }
}

// If mismatch, reconnect or recreate
```

---

### Issue 6: Multiple sessions with same phone number

**Symptoms:**
- Created 2+ sessions
- Both show "connected" in DB
- Only one actually works

**Root Cause:**
WhatsApp only allows ONE active connection per phone number

**Solution:**
```javascript
// Find all sessions for user
GET /api/v1/sessions

// Delete old/duplicate sessions
DELETE /api/v1/sessions/{old_id_1}
DELETE /api/v1/sessions/{old_id_2}

// Keep only one active session per phone
```

---

### Issue 7: "Auth state corrupted" error

**Symptoms:**
```
[createSession] Error: Unable to read creds.json
```

**Root Cause:**
Filesystem auth files corrupted (sessions/{sessionId}/creds.json)

**Solution:**
```bash
# Delete corrupted auth state
rm -rf sessions/{sessionId}/

# Recreate session (will generate fresh auth)
POST /api/v1/sessions
{
  "name": "recovered-session",
  "webhook_url": "..."
}
```

---

## 📊 SUMMARY & BEST PRACTICES

### ✅ DO's

1. **ALWAYS set webhook_url during session creation**
   ```javascript
   POST /api/v1/sessions
   { "name": "...", "webhook_url": "https://..." }
   ```

2. **Use database `id` (UUID) for API endpoints, not `session_id`**
   ```javascript
   GET /sessions/a2649a4f-... ✅
   GET /sessions/266cdcce-..._1768... ❌
   ```

3. **Check BOTH memory and database status**
   ```javascript
   const inMemory = whatsappService.isSessionConnected(sessionId);
   const inDB = await session.status;
   ```

4. **Respond to webhooks within 10 seconds**
   ```php
   dispatch(new ProcessWebhookJob($request->all()));
   return response()->json(['status' => 'ok']); // ✅ Fast
   ```

5. **Delete failed sessions before creating new ones**
   ```javascript
   DELETE /sessions/{id} → POST /sessions
   ```

6. **Use `forceNew: true` for persistent failures**
   ```javascript
   POST /sessions/{id}/reconnect { "forceNew": true }
   ```

### ❌ DON'Ts

1. **Don't create sessions without webhook_url (webhooks won't work)**

2. **Don't use session_id for API endpoint parameters**

3. **Don't process webhooks synchronously (timeout risk)**

4. **Don't trust memory status after server restart**

5. **Don't retry connections indefinitely (max 5 attempts)**

6. **Don't scan expired QR codes (request fresh one)**

---

## 🔧 DEBUGGING CHECKLIST

When session issues occur, check:

- [ ] Is webhook_url set in database? `SELECT webhook_url FROM sessions WHERE id = '...'`
- [ ] Is session in memory Map? `whatsappService.sessions.has(sessionId)`
- [ ] What's the DB status? `SELECT status FROM sessions WHERE id = '...'`
- [ ] Are there auth files? `ls sessions/{sessionId}/`
- [ ] Check reconnect attempts: `SELECT reconnect_attempts FROM sessions WHERE id = '...'`
- [ ] Is QR code still valid? (Generated < 60 seconds ago)
- [ ] Are webhook events configured? `SELECT webhook_events FROM sessions WHERE id = '...'`
- [ ] Check server logs: `tail -f logs/whatsapp-*.log`

---

**END OF DOCUMENT**

*Silakan gunakan dokumentasi ini sebagai referensi untuk troubleshooting dan development!*
