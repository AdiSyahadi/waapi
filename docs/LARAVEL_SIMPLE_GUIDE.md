# 🚀 WhatsApp API - Laravel CRM Integration (SIMPLE VERSION)

**Cara paling simple untuk integrasi WhatsApp API dengan Laravel CRM - TIDAK PERLU LOGIN!**

---

## ⚡ Quick Setup (5 Menit)

### Step 1: Dapatkan API Key

1. Buka dashboard: http://72.62.125.132:3001/dashboard
2. Login dengan admin credentials
3. Klik menu **"API Keys"** di sidebar
4. Klik **"Create New API Key"**
5. Beri nama: **"CRM Production"**
6. **COPY API KEY** yang muncul (contoh: `wapi_abc123...`)
   - ⚠️ **PENTING**: Key hanya tampil SEKALI! Simpan baik-baik!

### Step 2: Install Guzzle di Laravel

```bash
composer require guzzlehttp/guzzle
```

### Step 3: Tambahkan Config di `.env`

```env
WHATSAPP_API_URL=http://72.62.125.132/api/v1
WHATSAPP_API_KEY=wapi_your_api_key_here
WHATSAPP_SESSION_ID=crm-production
```

### Step 4: Tambahkan Config di `config/services.php`

```php
return [
    // ... existing configs
    
    'whatsapp' => [
        'api_url' => env('WHATSAPP_API_URL'),
        'api_key' => env('WHATSAPP_API_KEY'),
        'session_id' => env('WHATSAPP_SESSION_ID'),
    ],
];
```

### Step 5: Buat WhatsApp Service

**File: `app/Services/WhatsAppService.php`**

```php
<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
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

    /**
     * Kirim pesan text
     */
    public function sendText(string $phone, string $message): array
    {
        try {
            $response = $this->client->post("/messages/{$this->sessionId}/send/text", [
                'json' => [
                    'phone' => $this->formatPhone($phone),
                    'message' => $message
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Error: ' . $e->getMessage());
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Kirim gambar
     */
    public function sendImage(string $phone, string $imageUrl, ?string $caption = null): array
    {
        try {
            $response = $this->client->post("/messages/{$this->sessionId}/send/media-url", [
                'json' => [
                    'phone' => $this->formatPhone($phone),
                    'mediaUrl' => $imageUrl,
                    'mediaType' => 'image',
                    'caption' => $caption
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Error: ' . $e->getMessage());
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get session status
     */
    public function getSessionStatus(): array
    {
        try {
            $response = $this->client->get("/sessions/{$this->sessionId}/status");
            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Error: ' . $e->getMessage());
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Format nomor telepon ke format WhatsApp
     */
    private function formatPhone(string $phone): string
    {
        // Hapus semua karakter non-numeric
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Tambah kode negara Indonesia jika belum ada
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

---

## 🎯 Cara Pakai di Controller

### Contoh 1: Kirim Notifikasi Donasi Baru

```php
<?php

namespace App\Http\Controllers;

use App\Services\WhatsAppService;
use App\Models\Donasi;

class DonasiController extends Controller
{
    private WhatsAppService $whatsapp;

    public function __construct(WhatsAppService $whatsapp)
    {
        $this->whatsapp = $whatsapp;
    }

    public function store(Request $request)
    {
        // Simpan donasi
        $donasi = Donasi::create($request->all());

        // Kirim notifikasi WhatsApp ke donatur
        $message = "Terima kasih atas donasi Anda!\n\n" .
                   "Nominal: Rp " . number_format($donasi->nominal, 0, ',', '.') . "\n" .
                   "Program: {$donasi->program}\n\n" .
                   "Semoga berkah untuk Anda 🙏";

        $result = $this->whatsapp->sendText(
            $donasi->phone, 
            $message
        );

        if (!$result['success']) {
            Log::warning('Failed to send WhatsApp notification', [
                'donasi_id' => $donasi->id,
                'error' => $result['message']
            ]);
        }

        return response()->json([
            'success' => true,
            'donasi' => $donasi,
            'whatsapp_sent' => $result['success']
        ]);
    }
}
```

### Contoh 2: Reminder Pembayaran

```php
public function sendPaymentReminder($donasiId)
{
    $donasi = Donasi::findOrFail($donasiId);

    $message = "Halo {$donasi->nama},\n\n" .
               "Kami mengingatkan pembayaran donasi Anda:\n" .
               "Invoice: {$donasi->invoice_number}\n" .
               "Jumlah: Rp " . number_format($donasi->nominal, 0, ',', '.') . "\n\n" .
               "Silakan lakukan pembayaran melalui:\n" .
               "BCA: 1234567890\n" .
               "a.n. Yayasan ABC\n\n" .
               "Terima kasih!";

    $result = $this->whatsapp->sendText($donasi->phone, $message);

    return response()->json($result);
}
```

### Contoh 3: Broadcast ke Banyak Donatur

```php
public function broadcastProgramBaru()
{
    $donatur = Donasi::where('status', 'active')
        ->distinct('phone')
        ->get();

    $message = "🌟 Program Baru: Bantuan Pendidikan\n\n" .
               "Yayasan kami membuka program bantuan pendidikan " .
               "untuk anak-anak kurang mampu.\n\n" .
               "Donasi mulai dari Rp 50.000\n" .
               "Info: www.yayasan.com/program";

    $sent = 0;
    $failed = 0;

    foreach ($donatur as $d) {
        $result = $this->whatsapp->sendText($d->phone, $message);
        
        if ($result['success']) {
            $sent++;
        } else {
            $failed++;
        }

        // Delay untuk avoid rate limit
        sleep(2);
    }

    return response()->json([
        'total' => $donatur->count(),
        'sent' => $sent,
        'failed' => $failed
    ]);
}
```

---

## 🧪 Testing

### Test Sederhana

```php
// routes/web.php atau routes/api.php
Route::get('/test-whatsapp', function() {
    $whatsapp = new \App\Services\WhatsAppService();
    
    // Test 1: Cek status session
    $status = $whatsapp->getSessionStatus();
    
    // Test 2: Kirim pesan test
    $result = $whatsapp->sendText(
        '081234567890',  // Ganti dengan nomor Anda
        'Test dari Laravel CRM - ' . now()
    );
    
    return response()->json([
        'session_status' => $status,
        'send_result' => $result
    ]);
});
```

Akses: `http://your-laravel-app.com/test-whatsapp`

---

## ❓ FAQ

### Q: Apakah user CRM perlu login ke WhatsApp API?
**A: TIDAK!** User CRM hanya perlu API Key yang Anda set di `.env`. API Key ini di-generate sekali oleh admin.

### Q: Apakah perlu buat akun untuk setiap user CRM?
**A: TIDAK!** Cukup satu API Key untuk semua user di CRM Anda.

### Q: API Key bisa expired?
**A: Tidak**, kecuali Anda set expiration date saat membuat API Key. Default: tidak expired.

### Q: Bagaimana cara dapat nomor WhatsApp untuk session?
**A:** 
1. Akses dashboard: http://72.62.125.132:3001
2. Buka menu **Sessions**
3. Create session baru dengan ID: `crm-production`
4. Scan QR code dengan WhatsApp Business
5. Session siap dipakai!

### Q: Bisa pakai beberapa nomor WhatsApp?
**A: Bisa!** Tinggal buat session baru dengan ID berbeda:
- `crm-cs-1` untuk CS 1
- `crm-cs-2` untuk CS 2
- dst.

---

## 🔐 Security Best Practices

### 1. Jangan Expose API Key

```php
// ❌ JANGAN ini
echo config('services.whatsapp.api_key');

// ✅ DO ini - jangan pernah tampilkan API Key
Log::info('Sending WhatsApp', ['phone' => $phone]);
```

### 2. Validate Phone Number

```php
public function sendMessage(Request $request)
{
    $validated = $request->validate([
        'phone' => 'required|regex:/^(\+62|62|0)[0-9]{9,12}$/',
        'message' => 'required|string|max:4096'
    ]);

    $result = $this->whatsapp->sendText(
        $validated['phone'],
        $validated['message']
    );

    return response()->json($result);
}
```

### 3. Rate Limiting

```php
// app/Http/Kernel.php - throttle requests
Route::middleware('throttle:60,1')->group(function () {
    Route::post('/send-whatsapp', [WhatsAppController::class, 'send']);
});
```

---

## 📊 Monitoring

### Log Semua Pesan

```php
// Tambahkan di WhatsAppService
private function logMessage(string $phone, string $message, bool $success)
{
    \DB::table('whatsapp_logs')->insert([
        'phone' => $phone,
        'message' => $message,
        'success' => $success,
        'sent_at' => now(),
    ]);
}

public function sendText(string $phone, string $message): array
{
    $result = $this->client->post(...);
    
    $this->logMessage($phone, $message, $result['success'] ?? false);
    
    return $result;
}
```

---

## 🎉 Selesai!

**That's it!** Tidak perlu:
- ❌ Login/logout
- ❌ Token management
- ❌ Session handling
- ❌ Authentication flow

**Cukup:**
- ✅ Dapatkan API Key sekali
- ✅ Set di `.env`
- ✅ Langsung pakai!

Mudah kan? 😊
