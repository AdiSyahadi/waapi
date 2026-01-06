# WhatsApp API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All endpoints (except auth endpoints) require JWT authentication:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📱 Session Management

### 1. Create Session
**POST** `/sessions`

Create a new WhatsApp session using QR code or pairing code method.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body (QR Code Method - Default):**
```json
{
  "name": "My WhatsApp Session",
  "webhook_url": "https://your-domain.com/webhook",
  "webhook_events": ["message.received", "session.connected"]
}
```

**Body (Pairing Code Method):**
```json
{
  "name": "My WhatsApp Session",
  "use_pairing": true,
  "phone_number": "6281234567890",
  "webhook_url": "https://your-domain.com/webhook",
  "webhook_events": ["message.received", "session.connected"]
}
```

**Response (QR Code):**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session": {
      "id": 1,
      "session_id": "sess_123abc",
      "name": "My WhatsApp Session",
      "status": "qr",
      "qr_code": "data:image/png;base64,iVBORw0KGg...",
      "webhook_url": "https://your-domain.com/webhook"
    },
    "use_pairing": false
  }
}
```

**Response (Pairing Code):**
```json
{
  "success": true,
  "message": "Session created. Please enter pairing code in WhatsApp",
  "data": {
    "session": {
      "id": 1,
      "session_id": "sess_123abc",
      "name": "My WhatsApp Session",
      "status": "pairing",
      "pairing_code": "12345678",
      "phone_number": "6281234567890"
    },
    "use_pairing": true,
    "pairing_code": "12345678"
  }
}
```

---

### 2. Get All Sessions
**GET** `/sessions`

Get list of all your sessions with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (disconnected, connecting, connected)

**Example:**
```
GET /api/v1/sessions?page=1&limit=10&status=connected
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 1,
        "session_id": "sess_123abc",
        "name": "My WhatsApp Session",
        "status": "connected",
        "phone_number": "6281234567890"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

---

### 3. Get Session Details
**GET** `/sessions/:id`

Get details of a specific session.

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": 1,
      "session_id": "sess_123abc",
      "name": "My WhatsApp Session",
      "status": "connected",
      "phone_number": "6281234567890",
      "webhook_url": "https://your-domain.com/webhook",
      "is_connected": true
    }
  }
}
```

---

### 4. Get QR Code
**GET** `/sessions/:id/qr`

Get QR code for scanning (when session is disconnected).

**Response:**
```json
{
  "success": true,
  "data": {
    "qr_code": "data:image/png;base64,iVBORw0KGg...",
    "session_id": "sess_123abc"
  }
}
```

---

### 5. Reconnect Session
**POST** `/sessions/:id/reconnect`

Manually reconnect a disconnected session.

**Response:**
```json
{
  "success": true,
  "message": "Session reconnection initiated"
}
```

---

### 6. Disconnect Session
**POST** `/sessions/:id/disconnect`

Gracefully disconnect an active session.

**Response:**
```json
{
  "success": true,
  "message": "Session disconnected successfully"
}
```

---

### 7. Update Session
**PUT** `/sessions/:id`

Update session settings.

**Body:**
```json
{
  "name": "Updated Session Name",
  "webhook_url": "https://new-webhook.com",
  "webhook_events": ["message.received"],
  "auto_reconnect": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "session": {
      "id": 1,
      "name": "Updated Session Name"
    }
  }
}
```

---

### 8. Delete Session
**DELETE** `/sessions/:id`

Permanently delete a session and all its data.

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

## 💬 Message Management

### 1. Send Text Message
**POST** `/messages/:sessionId/send/text`

Send a text message to a WhatsApp number.

**Body:**
```json
{
  "phone": "6281234567890",
  "message": "Hello from API!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message": {
      "id": 1,
      "message_id": "3EB0XXXXX",
      "remote_jid": "6281234567890@s.whatsapp.net",
      "type": "text",
      "content": "Hello from API!",
      "status": "sent"
    },
    "whatsapp_id": "3EB0XXXXX"
  }
}
```

---

### 2. Send Media Message
**POST** `/messages/:sessionId/send/media`

Send image, video, audio, or document.

**Headers:**
```
Content-Type: multipart/form-data
```

**Form Data:**
- `phone`: WhatsApp number
- `type`: Media type (image, video, audio, document)
- `file`: File to send
- `caption`: Caption for media (optional)

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/v1/messages/sess_123abc/send/media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "phone=6281234567890" \
  -F "type=image" \
  -F "caption=Check this out!" \
  -F "file=@/path/to/image.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Media sent successfully",
  "data": {
    "message": {
      "id": 2,
      "message_id": "3EB0XXXXX",
      "type": "image",
      "media_url": "/uploads/media/image.jpg"
    }
  }
}
```

---

### 3. Get Messages
**GET** `/messages/:sessionId/messages`

Get message history for a session.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `phone`: Filter by phone number (optional)
- `type`: Filter by message type (optional)
- `from_me`: Filter by direction - true/false (optional)

**Example:**
```
GET /api/v1/messages/sess_123abc/messages?phone=6281234567890&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "message_id": "3EB0XXXXX",
        "remote_jid": "6281234567890@s.whatsapp.net",
        "from_me": true,
        "type": "text",
        "content": "Hello!",
        "timestamp": 1703261234567
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  }
}
```

---

### 4. Check Number
**GET** `/messages/:sessionId/check-number`

Check if a phone number is registered on WhatsApp.

**Query Parameters:**
- `phone`: Phone number to check

**Example:**
```
GET /api/v1/messages/sess_123abc/check-number?phone=6281234567890
```

**Response:**
```json
{
  "success": true,
  "data": {
    "phone": "6281234567890",
    "jid": "6281234567890@s.whatsapp.net",
    "registered": true
  }
}
```

---

### 5. Send Location
**POST** `/messages/:sessionId/send/location`

Send location message with coordinates.

**Body:**
```json
{
  "phone": "6281234567890",
  "latitude": -6.200000,
  "longitude": 106.816666,
  "name": "Jakarta",
  "address": "Jakarta, Indonesia"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location sent successfully",
  "data": {
    "message": {
      "id": 3,
      "type": "location",
      "status": "sent"
    }
  }
}
```

---

### 6. Send Contact
**POST** `/messages/:sessionId/send/contact`

Send contact/vcard message.

**Body:**
```json
{
  "phone": "6281234567890",
  "contacts": [
    {
      "displayName": "John Doe",
      "vcard": "BEGIN:VCARD\\nVERSION:3.0\\nFN:John Doe\\nTEL;type=CELL;type=VOICE;waid=6281234567890:+62 812 3456 7890\\nEND:VCARD"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contact sent successfully"
}
```

---

### 7. Send Button Message
**POST** `/messages/:sessionId/send/button`

Send interactive button message (max 3 buttons).

**Body:**
```json
{
  "phone": "6281234567890",
  "text": "Choose an option",
  "footer": "Powered by WhatsApp API",
  "buttons": [
    {
      "id": "btn1",
      "text": "Option 1"
    },
    {
      "id": "btn2",
      "text": "Option 2"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Button message sent successfully"
}
```

---

### 8. Send List Message
**POST** `/messages/:sessionId/send/list`

Send interactive list message with sections.

**Body:**
```json
{
  "phone": "6281234567890",
  "text": "Please choose from menu",
  "button_text": "View Menu",
  "footer": "Restaurant Menu",
  "sections": [
    {
      "title": "Main Course",
      "rows": [
        {
          "rowId": "item1",
          "title": "Nasi Goreng",
          "description": "Indonesian Fried Rice"
        },
        {
          "rowId": "item2",
          "title": "Mie Goreng",
          "description": "Indonesian Fried Noodles"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "List message sent successfully"
}
```

---

### 9. Send Poll
**POST** `/messages/:sessionId/send/poll`

Send poll message with multiple options.

**Body:**
```json
{
  "phone": "6281234567890",
  "name": "What's your favorite color?",
  "options": ["Red", "Blue", "Green", "Yellow"],
  "selectable_count": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Poll sent successfully"
}
```

---

### 10. Broadcast Messages
**POST** `/broadcast/:sessionId/broadcast`

Send message to multiple recipients at once.

**Body:**
```json
{
  "recipients": ["6281234567890", "6281234567891", "6281234567892"],
  "message": "Hello everyone!",
  "type": "text",
  "delay": 1000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Broadcast queued successfully",
  "data": {
    "broadcast_id": "bc_123abc",
    "total_recipients": 3,
    "estimated_time": "3s"
  }
}
```

---

## 📝 Message Templates

### 1. Create Template
**POST** `/templates`

Create reusable message template.

**Body:**
```json
{
  "name": "Welcome Message",
  "type": "text",
  "content": "Hello {{name}}, welcome to {{company}}!",
  "variables": ["name", "company"],
  "category": "greeting"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Template created successfully",
  "data": {
    "template": {
      "id": 1,
      "name": "Welcome Message",
      "type": "text",
      "usage_count": 0
    }
  }
}
```

---

### 2. Get All Templates
**GET** `/templates`

List all your templates with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by type
- `category`: Filter by category
- `search`: Search in name/content

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": 1,
        "name": "Welcome Message",
        "type": "text",
        "usage_count": 25
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

---

### 3. Use Template
**POST** `/templates/:id/use`

Send message using template with variable replacement.

**Body:**
```json
{
  "sessionId": "sess_123abc",
  "phone": "6281234567890",
  "variables": {
    "name": "John",
    "company": "Tech Corp"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Template sent successfully",
  "data": {
    "message": {
      "id": 5,
      "content": "Hello John, welcome to Tech Corp!"
    },
    "template": "Welcome Message"
  }
}
```

---

## 🔐 Authentication

### 1. Register
**POST** `/auth/register`

Register a new user account.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "organization_name": "My Company"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

### 2. Login
**POST** `/auth/login`

Login to get access token.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

---

### 3. Refresh Token
**POST** `/auth/refresh`

Get new access token using refresh token.

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 📊 Webhook Events

When you configure a webhook URL for your session, you'll receive POST requests for the following events:

### Event: `qr.generated`
```json
{
  "event": "qr.generated",
  "sessionId": "sess_123abc",
  "timestamp": 1703261234567,
  "data": {
    "qr_code": "2@abc123...",
    "retry_count": 0
  }
}
```

### Event: `session.connected`
```json
{
  "event": "session.connected",
  "sessionId": "sess_123abc",
  "timestamp": 1703261234567,
  "data": {
    "phone_number": "6281234567890",
    "status": "connected"
  }
}
```

### Event: `session.disconnected`
```json
{
  "event": "session.disconnected",
  "sessionId": "sess_123abc",
  "timestamp": 1703261234567,
  "data": {
    "reason": "Connection lost"
  }
}
```

### Event: `message.received`
```json
{
  "event": "message.received",
  "sessionId": "sess_123abc",
  "timestamp": 1703261234567,
  "data": {
    "message_id": "3EB0XXXXX",
    "from": "6281234567890@s.whatsapp.net",
    "type": "text",
    "content": "Hello!",
    "timestamp": 1703261234567
  }
}
```

---

## ⚠️ Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## 🔢 Phone Number Format

Phone numbers should be in international format without + or spaces:
- ✅ Correct: `6281234567890`
- ❌ Wrong: `+62 812 3456 7890`
- ❌ Wrong: `081234567890`

The API will automatically format numbers and add `@s.whatsapp.net` for WhatsApp JID.

---

## 📝 Notes

1. **Email Verification Required**: Email must be verified before using session/message endpoints
2. **Subscription Limits**: Free plan has limits on sessions and messages
3. **QR Code Expiry**: QR codes expire after 60 seconds - request a new one if expired
4. **Auto Reconnect**: Sessions will auto-reconnect up to 5 times if disconnected
5. **Media Files**: Maximum 16MB per file
6. **Webhooks**: Must respond with 2xx status within 5 seconds
