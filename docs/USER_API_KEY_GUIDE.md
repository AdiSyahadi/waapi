# ✅ JAWABAN LENGKAP - API Key & Usage Guide

**Untuk User dengan API Key:** `wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3`

---

## 1️⃣ Status API Key Anda

### ✅ **API KEY SUDAH AKTIF DAN VALID!**

```
API Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3
Status: ✅ ACTIVE
Tested: 2026-01-12
```

API Key Anda sudah di-test dan berfungsi dengan baik!

---

## 2️⃣ Format Authorization Header yang BENAR

### ⚠️ PENTING: Gunakan `X-API-Key`, BUKAN `Bearer`!

```http
X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3
```

**❌ SALAH:**
```http
Authorization: Bearer wapi_xxxxx
```

**✅ BENAR:**
```http
X-API-Key: wapi_xxxxx
```

---

## 3️⃣ IP Whitelist

### ℹ️ Tidak Ada IP Whitelist (Default)

API Key Anda tidak memiliki IP whitelist restriction, jadi bisa digunakan dari IP manapun. 

**Jika butuh IP whitelist untuk keamanan:**
- Hubungi admin untuk menambahkan IP whitelist
- IP whitelist berguna untuk production environment

---

## 4️⃣ Endpoint yang BENAR

### Base URL
```
http://72.62.125.132/api/v1
```

### Create Session

**❌ SALAH - Parameter `session_id`:**
```json
{
  "session_id": "test"  // ❌ Salah!
}
```

**✅ BENAR - Parameter `name`:**
```json
{
  "name": "my-session-name"  // ✅ Benar!
}
```

---

## 5️⃣ Contoh cURL yang WORKING

### ✅ Test 1: Get All Sessions (List)

```bash
curl -X GET http://72.62.125.132/api/v1/sessions \
  -H "X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "session_id": "xxx",
      "name": "my-session",
      "status": "connected"
    }
  ]
}
```

---

### ✅ Test 2: Create New Session

```bash
curl -X POST http://72.62.125.132/api/v1/sessions \
  -H "X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-crm-session"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session": {
      "id": "fe075965-0bc5-4ff5-bd8e-5ced08457e1e",
      "name": "my-crm-session",
      "status": "connecting",
      "session_id": "266cdcce-97a1-4d70-a6c5-b561b90acdfd_1768188405360"
    }
  }
}
```

---

### ✅ Test 3: Get QR Code untuk Scan

```bash
curl -X GET "http://72.62.125.132/api/v1/sessions/{SESSION_ID}/qr" \
  -H "X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3"
```

Ganti `{SESSION_ID}` dengan session_id dari response create session.

---

### ✅ Test 4: Get Session Status

```bash
curl -X GET "http://72.62.125.132/api/v1/sessions/{SESSION_ID}/status" \
  -H "X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3"
```

---

### ✅ Test 5: Send Text Message

```bash
curl -X POST "http://72.62.125.132/api/v1/messages/{SESSION_ID}/send/text" \
  -H "X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "6281234567890@s.whatsapp.net",
    "message": "Test message from CRM"
  }'
```

---

## 6️⃣ Contoh PowerShell (Windows)

### Create Session

```powershell
$API_KEY = "wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3"

$body = @{
    name = "crm-production"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://72.62.125.132/api/v1/sessions" `
    -Method POST `
    -Headers @{
        "X-API-Key" = $API_KEY
        "Content-Type" = "application/json"
    } `
    -Body $body

Write-Host "Session ID: $($response.data.session.session_id)"
Write-Host "Status: $($response.data.session.status)"
```

### Send Message

```powershell
$SESSION_ID = "your-session-id-here"

$messageBody = @{
    phone = "6281234567890@s.whatsapp.net"
    message = "Hello from PowerShell!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://72.62.125.132/api/v1/messages/$SESSION_ID/send/text" `
    -Method POST `
    -Headers @{
        "X-API-Key" = $API_KEY
        "Content-Type" = "application/json"
    } `
    -Body $messageBody
```

---

## 7️⃣ Contoh PHP (Laravel)

### Setup (.env)

```env
WHATSAPP_API_URL=http://72.62.125.132/api/v1
WHATSAPP_API_KEY=wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3
WHATSAPP_SESSION_ID=crm-production
```

### WhatsAppService.php

```php
<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private Client $client;
    private string $sessionId;

    public function __construct()
    {
        $this->sessionId = config('services.whatsapp.session_id');
        
        $this->client = new Client([
            'base_uri' => config('services.whatsapp.api_url'),
            'timeout' => 30,
            'headers' => [
                'X-API-Key' => config('services.whatsapp.api_key'),
                'Content-Type' => 'application/json',
            ]
        ]);
    }

    public function createSession(string $name): array
    {
        try {
            $response = $this->client->post('/sessions', [
                'json' => ['name' => $name]
            ]);
            
            return json_decode($response->getBody(), true);
        } catch (\Exception $e) {
            Log::error('WhatsApp Error: ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function sendText(string $phone, string $message): array
    {
        try {
            $response = $this->client->post("/messages/{$this->sessionId}/send/text", [
                'json' => [
                    'phone' => $phone,
                    'message' => $message
                ]
            ]);
            
            return json_decode($response->getBody(), true);
        } catch (\Exception $e) {
            Log::error('WhatsApp Error: ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}
```

---

## 8️⃣ Troubleshooting

### Error: "API key required"

**Penyebab:** Header tidak ada atau salah

**Solusi:**
```bash
# ❌ Salah
-H "Authorization: Bearer wapi_xxxxx"

# ✅ Benar
-H "X-API-Key: wapi_xxxxx"
```

---

### Error: "Invalid API key"

**Penyebab:** API Key salah atau tidak aktif

**Solusi:** Pastikan menggunakan API Key yang benar:
```
wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3
```

---

### Error: "Session name is required"

**Penyebab:** Menggunakan parameter `session_id` instead of `name`

**Solusi:**
```json
// ❌ Salah
{"session_id": "test"}

// ✅ Benar
{"name": "test"}
```

---

### Error: "Session not found"

**Penyebab:** Session ID tidak ada atau belum dibuat

**Solusi:**
1. Create session dulu dengan endpoint POST `/sessions`
2. Gunakan `session_id` dari response
3. Gunakan session_id tersebut untuk send message

---

## 9️⃣ Flow Lengkap (Step by Step)

### Step 1: Create Session
```bash
curl -X POST http://72.62.125.132/api/v1/sessions \
  -H "X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-session"}'
```

**Save `session_id` from response!**

---

### Step 2: Get QR Code
```bash
curl -X GET http://72.62.125.132/api/v1/sessions/{SESSION_ID}/qr \
  -H "X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3"
```

**Scan QR code dengan WhatsApp!**

---

### Step 3: Check Status
```bash
curl -X GET http://72.62.125.132/api/v1/sessions/{SESSION_ID}/status \
  -H "X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3"
```

**Wait until status = "connected"**

---

### Step 4: Send Message
```bash
curl -X POST http://72.62.125.132/api/v1/messages/{SESSION_ID}/send/text \
  -H "X-API-Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "6281234567890@s.whatsapp.net",
    "message": "Hello!"
  }'
```

---

## 🔟 Quick Reference

| Item | Value |
|------|-------|
| **Base URL** | `http://72.62.125.132/api/v1` |
| **Header Name** | `X-API-Key` (BUKAN Authorization!) |
| **API Key** | `wapi_35a798...` (sudah valid) |
| **Create Session Param** | `name` (BUKAN session_id!) |
| **Phone Format** | `6281234567890@s.whatsapp.net` |

---

## 📞 Support

Jika masih ada masalah, kirim:
1. Request cURL yang error
2. Response error yang didapat
3. Screenshot jika perlu

---

**Status:** ✅ API Key tested and working - 2026-01-12
