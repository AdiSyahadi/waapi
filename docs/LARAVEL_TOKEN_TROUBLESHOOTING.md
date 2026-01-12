# Troubleshooting Token "Invalid or expired token" - Laravel Integration

## 🔍 Diagnosa Masalah

Error `{"success":false,"message":"Invalid or expired token"}` dengan status code 401 terjadi karena:

1. **Token tidak valid** - Token yang digunakan tidak sesuai
2. **Token expired** - Token sudah kadaluarsa (default: 24 jam)
3. **Format header salah** - Authorization header tidak benar
4. **Belum login** - Token belum di-generate dari endpoint login

---

## ✅ Langkah-langkah Perbaikan

### Step 1: Login Terlebih Dahulu untuk Mendapatkan Token

Sebelum menggunakan API sessions atau endpoint lainnya, Anda **HARUS login** terlebih dahulu untuk mendapatkan JWT token.

#### **Test Login dengan PowerShell:**

```powershell
# 1. Login untuk mendapatkan token
$loginBody = @{
    email = "admin@example.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://72.62.125.132/api/v1/auth/login" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $loginBody

# 2. Simpan token
$token = $response.data.token
Write-Host "Token berhasil didapat: $token"

# 3. Test menggunakan token untuk create session
$sessionBody = @{
    session_id = "laravel-test-session"
    webhook_url = "https://yourdomain.com/webhook/whatsapp"
} | ConvertTo-Json

$sessionResponse = Invoke-RestMethod -Uri "http://72.62.125.132/api/v1/sessions" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
    } `
    -Body $sessionBody

Write-Host "Session created: $($sessionResponse | ConvertTo-Json)"
```

#### **Test Login dengan cURL:**

```bash
# 1. Login
curl -X POST http://72.62.125.132/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Response:
# {
#   "success": true,
#   "message": "Login successful",
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "refreshToken": "...",
#     "user": { ... }
#   }
# }

# 2. Gunakan token untuk create session
curl -X POST http://72.62.125.132/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "session_id": "laravel-test",
    "webhook_url": "https://yourdomain.com/webhook"
  }'
```

---

### Step 2: Implementasi di Laravel

#### **1. Update WhatsAppService.php**

```php
<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class WhatsAppService
{
    private Client $client;
    private string $baseUrl;
    private ?string $token = null;

    public function __construct()
    {
        $this->baseUrl = config('services.whatsapp.api_url', 'http://72.62.125.132/api/v1');
        
        // Try to get token from cache first
        $this->token = Cache::get('whatsapp_api_token');
        
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30,
            'verify' => false, // For local development
        ]);
    }

    /**
     * Login dan dapatkan JWT token
     */
    public function login(string $email, string $password): array
    {
        try {
            $response = $this->client->post('/auth/login', [
                'json' => [
                    'email' => $email,
                    'password' => $password
                ]
            ]);

            $body = json_decode($response->getBody()->getContents(), true);

            if ($body['success'] ?? false) {
                // Simpan token ke cache (expire 23 jam untuk safety margin)
                $token = $body['data']['token'] ?? null;
                if ($token) {
                    $this->saveToken($token);
                }

                return [
                    'success' => true,
                    'data' => $body['data'],
                    'message' => 'Login successful'
                ];
            }

            return [
                'success' => false,
                'message' => $body['message'] ?? 'Login failed'
            ];

        } catch (GuzzleException $e) {
            Log::error('WhatsApp Login Error: ' . $e->getMessage());
            
            // Try to get response body for detailed error
            if ($e->hasResponse()) {
                $errorBody = json_decode($e->getResponse()->getBody(), true);
                return [
                    'success' => false,
                    'message' => $errorBody['message'] ?? $e->getMessage()
                ];
            }

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Simpan token ke cache dengan expiry
     */
    public function saveToken(string $token): void
    {
        // Simpan untuk 23 jam (safety margin dari 24 jam default)
        Cache::put('whatsapp_api_token', $token, now()->addHours(23));
        $this->token = $token;
        
        Log::info('WhatsApp API token saved to cache');
    }

    /**
     * Get current token
     */
    public function getToken(): ?string
    {
        if (!$this->token) {
            $this->token = Cache::get('whatsapp_api_token');
        }
        return $this->token;
    }

    /**
     * Check if token is available
     */
    public function hasValidToken(): bool
    {
        return !empty($this->getToken());
    }

    /**
     * Auto-login if no valid token
     */
    private function ensureAuthenticated(): bool
    {
        if ($this->hasValidToken()) {
            return true;
        }

        // Auto-login using credentials from config
        $email = config('services.whatsapp.email');
        $password = config('services.whatsapp.password');

        if (!$email || !$password) {
            Log::error('WhatsApp API credentials not configured');
            return false;
        }

        $result = $this->login($email, $password);
        return $result['success'] ?? false;
    }

    /**
     * Get authorization headers
     */
    private function getHeaders(): array
    {
        if (!$this->hasValidToken()) {
            $this->ensureAuthenticated();
        }

        return [
            'Authorization' => 'Bearer ' . $this->getToken(),
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];
    }

    /**
     * Make HTTP request with error handling and auto-retry on auth failure
     */
    private function makeRequest(string $method, string $endpoint, array $data = [], int $retryCount = 0)
    {
        try {
            if (!$this->hasValidToken()) {
                $this->ensureAuthenticated();
            }

            $options = ['headers' => $this->getHeaders()];
            
            if (!empty($data)) {
                if ($method === 'GET') {
                    $options['query'] = $data;
                } else {
                    $options['json'] = $data;
                }
            }

            Log::info("WhatsApp API Request: {$method} {$endpoint}", [
                'has_token' => $this->hasValidToken(),
                'data' => $data
            ]);

            $response = $this->client->request($method, $endpoint, $options);
            $body = json_decode($response->getBody()->getContents(), true);

            return [
                'success' => true,
                'data' => $body['data'] ?? $body,
                'message' => $body['message'] ?? 'Success'
            ];

        } catch (GuzzleException $e) {
            $statusCode = $e->hasResponse() ? $e->getResponse()->getStatusCode() : 0;
            
            Log::error('WhatsApp API Error', [
                'method' => $method,
                'endpoint' => $endpoint,
                'status_code' => $statusCode,
                'error' => $e->getMessage()
            ]);

            // Retry once on 401 (token expired)
            if ($statusCode === 401 && $retryCount === 0) {
                Log::info('Token expired, attempting to re-authenticate...');
                
                // Clear old token
                Cache::forget('whatsapp_api_token');
                $this->token = null;
                
                // Try to login again
                if ($this->ensureAuthenticated()) {
                    // Retry the original request
                    return $this->makeRequest($method, $endpoint, $data, $retryCount + 1);
                }
            }

            if ($e->hasResponse()) {
                $errorBody = json_decode($e->getResponse()->getBody(), true);
                return [
                    'success' => false,
                    'data' => null,
                    'message' => $errorBody['message'] ?? $e->getMessage(),
                    'status_code' => $statusCode
                ];
            }
            
            return [
                'success' => false,
                'data' => null,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Create new WhatsApp session
     */
    public function createSession(string $sessionId, ?string $webhookUrl = null): array
    {
        $data = ['session_id' => $sessionId];
        if ($webhookUrl) {
            $data['webhook_url'] = $webhookUrl;
        }

        return $this->makeRequest('POST', '/sessions', $data);
    }

    /**
     * Get QR Code
     */
    public function getQRCode(string $sessionId): array
    {
        return $this->makeRequest('GET', "/sessions/{$sessionId}/qr");
    }

    /**
     * Get session status
     */
    public function getSessionStatus(string $sessionId): array
    {
        return $this->makeRequest('GET', "/sessions/{$sessionId}/status");
    }

    /**
     * Send text message
     */
    public function sendText(string $sessionId, string $phone, string $message): array
    {
        return $this->makeRequest('POST', "/messages/{$sessionId}/send/text", [
            'phone' => $this->formatPhone($phone),
            'message' => $message
        ]);
    }

    /**
     * Format phone number to international format
     */
    private function formatPhone(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Add country code if not present
        if (substr($phone, 0, 2) !== '62') {
            if (substr($phone, 0, 1) === '0') {
                $phone = '62' . substr($phone, 1);
            } else {
                $phone = '62' . $phone;
            }
        }
        
        return $phone . '@s.whatsapp.net';
    }
}
```

#### **2. Update config/services.php**

```php
return [
    // ... existing services
    
    'whatsapp' => [
        'api_url' => env('WHATSAPP_API_URL', 'http://72.62.125.132/api/v1'),
        'email' => env('WHATSAPP_API_EMAIL'),
        'password' => env('WHATSAPP_API_PASSWORD'),
    ],
];
```

#### **3. Update .env**

```env
WHATSAPP_API_URL=http://72.62.125.132/api/v1
WHATSAPP_API_EMAIL=admin@example.com
WHATSAPP_API_PASSWORD=admin123
```

---

### Step 3: Test di Laravel Controller

```php
<?php

namespace App\Http\Controllers;

use App\Services\WhatsAppService;
use Illuminate\Http\Request;

class WhatsAppController extends Controller
{
    private WhatsAppService $whatsapp;

    public function __construct(WhatsAppService $whatsapp)
    {
        $this->whatsapp = $whatsapp;
    }

    /**
     * Manual login (untuk testing)
     */
    public function login(Request $request)
    {
        $result = $this->whatsapp->login(
            $request->input('email', 'admin@example.com'),
            $request->input('password', 'admin123')
        );

        return response()->json($result);
    }

    /**
     * Create session (auto-login jika belum ada token)
     */
    public function createSession(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'webhook_url' => 'nullable|url'
        ]);

        $result = $this->whatsapp->createSession(
            $validated['session_id'],
            $validated['webhook_url'] ?? null
        );

        return response()->json($result);
    }

    /**
     * Get QR Code
     */
    public function getQRCode(string $sessionId)
    {
        $result = $this->whatsapp->getQRCode($sessionId);
        return response()->json($result);
    }

    /**
     * Send message
     */
    public function sendMessage(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'phone' => 'required|string',
            'message' => 'required|string'
        ]);

        $result = $this->whatsapp->sendText(
            $validated['session_id'],
            $validated['phone'],
            $validated['message']
        );

        return response()->json($result);
    }
}
```

---

## 🧪 Testing

### 1. Test Login Manual

```php
// routes/web.php
Route::get('/test-whatsapp-login', function() {
    $whatsapp = new \App\Services\WhatsAppService();
    
    $result = $whatsapp->login('admin@example.com', 'admin123');
    
    return response()->json([
        'login_result' => $result,
        'has_token' => $whatsapp->hasValidToken(),
        'token' => substr($whatsapp->getToken() ?? 'null', 0, 50) . '...'
    ]);
});
```

### 2. Test Create Session

```php
Route::get('/test-whatsapp-session', function() {
    $whatsapp = new \App\Services\WhatsAppService();
    
    // Akan auto-login jika belum ada token
    $result = $whatsapp->createSession('laravel-test-' . time());
    
    return response()->json($result);
});
```

---

## 🔧 Debugging

### Cek Token di Cache

```php
Route::get('/check-token', function() {
    $token = Cache::get('whatsapp_api_token');
    
    if (!$token) {
        return 'No token in cache';
    }
    
    // Parse JWT to check expiry
    try {
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payload = json_decode(base64_decode($parts[1]), true);
            
            return [
                'has_token' => true,
                'token_preview' => substr($token, 0, 50) . '...',
                'expires_at' => date('Y-m-d H:i:s', $payload['exp']),
                'issued_at' => date('Y-m-d H:i:s', $payload['iat']),
                'user_id' => $payload['id'] ?? null,
                'is_expired' => $payload['exp'] < time()
            ];
        }
    } catch (\Exception $e) {
        return ['error' => 'Invalid token format'];
    }
    
    return ['token' => substr($token, 0, 100)];
});
```

### Clear Token Cache

```php
Route::get('/clear-token', function() {
    Cache::forget('whatsapp_api_token');
    return 'Token cache cleared';
});
```

---

## 📌 Kesimpulan

**Root cause error "Invalid or expired token":**

1. ❌ **Tidak login dulu** - Harus panggil `/auth/login` terlebih dahulu
2. ❌ **Token expired** - Token hanya valid 24 jam
3. ❌ **Format Authorization salah** - Harus `Bearer <token>`, bukan hanya `<token>`

**Solusi:**
- ✅ Selalu login dulu untuk mendapatkan token
- ✅ Simpan token di cache dengan expiry management
- ✅ Implement auto-retry dengan re-authentication ketika token expired
- ✅ Gunakan format header yang benar: `Authorization: Bearer <token>`

**Dengan implementasi di atas:**
- Token akan otomatis di-generate saat pertama kali digunakan
- Token akan di-cache untuk menghindari login berulang-ulang
- Jika token expired, sistem akan otomatis login ulang dan retry request
