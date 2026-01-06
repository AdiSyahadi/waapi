# API Key Integration Guide

Panduan lengkap untuk mengintegrasikan WhatsApp API dengan sistem CRM menggunakan API Key.

## Daftar Isi
1. [Mendapatkan API Key](#mendapatkan-api-key)
2. [Cara Menggunakan API Key](#cara-menggunakan-api-key)
3. [Endpoint Yang Tersedia](#endpoint-yang-tersedia)
4. [Contoh Integrasi CRM](#contoh-integrasi-crm)
5. [Best Practices](#best-practices)
6. [Error Handling](#error-handling)

---

## Mendapatkan API Key

### 1. Login ke Dashboard
Akses dashboard di: `http://72.62.125.132:3001/dashboard`

### 2. Buka Halaman API Keys
Navigasi ke menu **API Keys** di sidebar

### 3. Create New API Key
- Klik tombol **"Create New API Key"**
- Masukkan nama yang deskriptif (contoh: "CRM Production", "Development Key")
- Klik **"Create Key"**

### 4. Copy API Key
⚠️ **PENTING**: API Key hanya ditampilkan **sekali** saat pembuatan!
- Copy API key yang ditampilkan di modal
- Simpan di tempat aman (environment variables, secrets manager)
- Jangan commit ke version control

**Format API Key**: 
```
whatsapp_live_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
```

---

## Cara Menggunakan API Key

### Authentication Header
Setiap request ke API harus menyertakan API Key di header:

```
X-API-Key: wapi_your_api_key_here
```

### Base URL
```
http://72.62.125.132:3000/api/v1
```

### Contoh Request (cURL)
```bash
curl -X POST http://72.62.125.132:3000/api/v1/messages/send/text \
  -H "X-API-Key: wapi_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "phone": "6281234567890",
    "message": "Hello from CRM!"
  }'
```

---

## Endpoint Yang Tersedia

### 1. Sessions Management

#### Create Session
```http
POST /api/v1/sessions
Content-Type: application/json
X-API-Key: wapi_xxxxx

{
  "name": "CRM WhatsApp",
  "webhook_url": "https://your-crm.com/webhook/whatsapp"
}
```

#### Get Session Status
```http
GET /api/v1/sessions/{sessionId}/status
X-API-Key: wapi_xxxxx
```

#### Get QR Code
```http
GET /api/v1/sessions/{sessionId}/qr
X-API-Key: wapi_xxxxx
```

#### Delete Session
```http
DELETE /api/v1/sessions/{sessionId}
X-API-Key: wapi_xxxxx
```

---

### 2. Send Messages

#### Send Text Message
```http
POST /api/v1/messages/send/text
Content-Type: application/json
X-API-Key: wapi_xxxxx

{
  "sessionId": "your-session-id",
  "phone": "6281234567890",
  "message": "Hello from CRM System!"
}
```

#### Send Media (Image/Video/Document)
```http
POST /api/v1/messages/send/media
Content-Type: multipart/form-data
X-API-Key: wapi_xxxxx

sessionId: your-session-id
phone: 6281234567890
caption: Optional caption
media: [file upload]
```

#### Send Media by URL
```http
POST /api/v1/messages/send/media-url
Content-Type: application/json
X-API-Key: wapi_xxxxx

{
  "sessionId": "your-session-id",
  "phone": "6281234567890",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Check this out!",
  "mediaType": "image"
}
```

#### Send Template Message
```http
POST /api/v1/messages/send/template
Content-Type: application/json
X-API-Key: wapi_xxxxx

{
  "sessionId": "your-session-id",
  "phone": "6281234567890",
  "templateId": "template-uuid",
  "variables": {
    "name": "John Doe",
    "orderNumber": "ORD-12345"
  }
}
```

---

### 3. Contacts Management

#### Get Contact List
```http
GET /api/v1/contacts/list?sessionId=your-session-id
X-API-Key: wapi_xxxxx
```

#### Check WhatsApp Registration
```http
POST /api/v1/contacts/check
Content-Type: application/json
X-API-Key: wapi_xxxxx

{
  "sessionId": "your-session-id",
  "phones": ["6281234567890", "6289876543210"]
}
```

#### Get Contact Info
```http
GET /api/v1/contacts/info?sessionId=your-session-id&phone=6281234567890
X-API-Key: wapi_xxxxx
```

---

### 4. Groups Management

#### Create Group
```http
POST /api/v1/groups/create
Content-Type: application/json
X-API-Key: wapi_xxxxx

{
  "sessionId": "your-session-id",
  "name": "Customer Support Group",
  "participants": ["6281234567890", "6289876543210"]
}
```

#### Get Group Info
```http
GET /api/v1/groups/info?sessionId=your-session-id&groupId=group-id
X-API-Key: wapi_xxxxx
```

---

## Contoh Integrasi CRM

### PHP (Laravel/CodeIgniter)

```php
<?php
class WhatsAppService
{
    private $apiKey = 'wapi_your_api_key_here';
    private $baseUrl = 'http://72.62.125.132:3000/api/v1';
    
    public function sendMessage($sessionId, $phone, $message)
    {
        $url = $this->baseUrl . '/messages/send/text';
        
        $data = [
            'sessionId' => $sessionId,
            'phone' => $phone,
            'message' => $message
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('Failed to send message: ' . $response);
        }
        
        return json_decode($response, true);
    }
    
    public function checkWhatsAppNumber($sessionId, $phones)
    {
        $url = $this->baseUrl . '/contacts/check';
        
        $data = [
            'sessionId' => $sessionId,
            'phones' => $phones
        ];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey
        ]);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}

// Contoh Penggunaan
$wa = new WhatsAppService();

// Send message dari CRM
$result = $wa->sendMessage(
    'your-session-id',
    '6281234567890',
    'Hi, your order #12345 has been shipped!'
);

// Check nomor WhatsApp sebelum kirim
$check = $wa->checkWhatsAppNumber('your-session-id', [
    '6281234567890',
    '6289876543210'
]);
?>
```

---

### Python (Django/Flask)

```python
import requests
import json

class WhatsAppAPI:
    def __init__(self):
        self.api_key = 'wapi_your_api_key_here'
        self.base_url = 'http://72.62.125.132:3000/api/v1'
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }
    
    def send_message(self, session_id, phone, message):
        """Send text message"""
        url = f'{self.base_url}/messages/send/text'
        
        payload = {
            'sessionId': session_id,
            'phone': phone,
            'message': message
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        
        if response.status_code != 200:
            raise Exception(f'Failed to send message: {response.text}')
        
        return response.json()
    
    def send_media_url(self, session_id, phone, media_url, caption='', media_type='image'):
        """Send media by URL"""
        url = f'{self.base_url}/messages/send/media-url'
        
        payload = {
            'sessionId': session_id,
            'phone': phone,
            'mediaUrl': media_url,
            'caption': caption,
            'mediaType': media_type
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()
    
    def get_session_status(self, session_id):
        """Get session status"""
        url = f'{self.base_url}/sessions/{session_id}/status'
        response = requests.get(url, headers=self.headers)
        return response.json()

# Contoh Penggunaan
wa_api = WhatsAppAPI()

# Kirim notifikasi order
result = wa_api.send_message(
    session_id='your-session-id',
    phone='6281234567890',
    message='Hi, your invoice #INV-001 is ready!'
)

print(result)

# Kirim gambar produk
wa_api.send_media_url(
    session_id='your-session-id',
    phone='6281234567890',
    media_url='https://yourcrm.com/products/product-123.jpg',
    caption='Check out our new product!',
    media_type='image'
)
```

---

### JavaScript/Node.js (Express)

```javascript
const axios = require('axios');

class WhatsAppAPI {
  constructor() {
    this.apiKey = 'wapi_your_api_key_here';
    this.baseUrl = 'http://72.62.125.132:3000/api/v1';
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };
  }

  async sendMessage(sessionId, phone, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages/send/text`,
        {
          sessionId,
          phone,
          message
        },
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async sendTemplate(sessionId, phone, templateId, variables) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages/send/template`,
        {
          sessionId,
          phone,
          templateId,
          variables
        },
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send template: ${error.message}`);
    }
  }

  async getSessionStatus(sessionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/sessions/${sessionId}/status`,
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }
}

// Contoh Penggunaan
const wa = new WhatsAppAPI();

// Send notification dari CRM
app.post('/crm/send-notification', async (req, res) => {
  try {
    const { customerPhone, orderNumber } = req.body;
    
    const result = await wa.sendMessage(
      'your-session-id',
      customerPhone,
      `Your order #${orderNumber} has been confirmed!`
    );
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send template
app.post('/crm/send-invoice', async (req, res) => {
  try {
    const { customerPhone, invoiceNumber, amount } = req.body;
    
    const result = await wa.sendTemplate(
      'your-session-id',
      customerPhone,
      'invoice-template-id',
      {
        invoiceNumber,
        amount
      }
    );
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { WhatsAppAPI };
```

---

### C# (.NET)

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class WhatsAppAPI
{
    private readonly string _apiKey = "wapi_your_api_key_here";
    private readonly string _baseUrl = "http://72.62.125.132:3000/api/v1";
    private readonly HttpClient _httpClient;

    public WhatsAppAPI()
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", _apiKey);
    }

    public async Task<string> SendMessage(string sessionId, string phone, string message)
    {
        var url = $"{_baseUrl}/messages/send/text";
        
        var payload = new
        {
            sessionId = sessionId,
            phone = phone,
            message = message
        };
        
        var json = JsonConvert.SerializeObject(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PostAsync(url, content);
        
        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Failed to send message: {response.StatusCode}");
        }
        
        return await response.Content.ReadAsStringAsync();
    }

    public async Task<string> CheckWhatsAppNumber(string sessionId, string[] phones)
    {
        var url = $"{_baseUrl}/contacts/check";
        
        var payload = new
        {
            sessionId = sessionId,
            phones = phones
        };
        
        var json = JsonConvert.SerializeObject(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PostAsync(url, content);
        return await response.Content.ReadAsStringAsync();
    }
}

// Contoh Penggunaan
public class CRMController
{
    private readonly WhatsAppAPI _whatsApp;

    public CRMController()
    {
        _whatsApp = new WhatsAppAPI();
    }

    public async Task SendOrderNotification(string customerPhone, string orderNumber)
    {
        try
        {
            var result = await _whatsApp.SendMessage(
                "your-session-id",
                customerPhone,
                $"Hi! Your order #{orderNumber} has been processed."
            );
            
            Console.WriteLine($"Message sent: {result}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}
```

---

## Best Practices

### 1. Environment Variables
❌ **JANGAN**:
```php
$apiKey = 'wapi_1a2b3c4d5e6f...'; // Hard-coded
```

✅ **LAKUKAN**:
```php
// .env file
WHATSAPP_API_KEY=wapi_1a2b3c4d5e6f...

// Code
$apiKey = env('WHATSAPP_API_KEY');
```

### 2. Rate Limiting
Implementasikan throttling untuk menghindari spam:

```php
// Batasi 5 pesan per menit per nomor
$redis->setex("wa:limit:$phone", 60, 5);
```

### 3. Error Handling
Selalu handle error dengan baik:

```javascript
try {
  await wa.sendMessage(sessionId, phone, message);
} catch (error) {
  // Log error
  logger.error('WhatsApp send failed:', error);
  
  // Retry mechanism
  await queue.add('retry-whatsapp', { sessionId, phone, message });
  
  // Notify admin
  await notifyAdmin('WhatsApp API Error', error.message);
}
```

### 4. Webhook Handler
Setup webhook untuk menerima incoming messages:

```javascript
app.post('/webhook/whatsapp', (req, res) => {
  const { event, data } = req.body;
  
  switch(event) {
    case 'message.received':
      handleIncomingMessage(data);
      break;
    case 'message.status':
      updateMessageStatus(data);
      break;
  }
  
  res.json({ success: true });
});
```

### 5. Queue System
Gunakan queue untuk mengirim message secara asyncron:

```python
# Menggunakan Celery
@celery.task
def send_whatsapp_message(session_id, phone, message):
    wa_api = WhatsAppAPI()
    return wa_api.send_message(session_id, phone, message)

# Trigger dari CRM
send_whatsapp_message.delay('session-id', '6281234567890', 'Hello!')
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 400 | Bad Request | Check payload format |
| 401 | Unauthorized | Verify API key |
| 403 | Forbidden | Check subscription plan |
| 404 | Not Found | Verify session ID |
| 429 | Too Many Requests | Implement rate limiting |
| 500 | Server Error | Retry with exponential backoff |

### Error Response Format

```json
{
  "success": false,
  "message": "Invalid phone number format",
  "error": "Phone must start with country code (e.g., 6281234567890)"
}
```

### Retry Logic Example

```javascript
async function sendWithRetry(sessionId, phone, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await wa.sendMessage(sessionId, phone, message);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff: 1s, 2s, 4s
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

---

## Security Checklist

✅ Store API key in environment variables  
✅ Never commit API key to version control  
✅ Use HTTPS in production  
✅ Implement rate limiting  
✅ Validate phone numbers before sending  
✅ Log all API requests for audit  
✅ Rotate API keys regularly  
✅ Monitor API usage  
✅ Set up webhook authentication  
✅ Implement retry mechanism with backoff  

---

## Support & Contact

- **Dashboard**: http://72.62.125.132:3001
- **API Base URL**: http://72.62.125.132:3000/api/v1
- **Documentation**: http://72.62.125.132:3000/api-docs

---

## Changelog

### v1.0.0 (2026-01-06)
- Initial release
- Basic messaging endpoints
- Session management
- Contact management
- Group management
- Template support

---

**Happy Integrating! 🚀**
