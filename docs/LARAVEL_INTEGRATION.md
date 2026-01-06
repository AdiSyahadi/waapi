# WhatsApp API - Laravel Integration Guide

Panduan lengkap integrasi WhatsApp API SaaS dengan aplikasi Laravel.

---

## 📋 Daftar Isi

1. [Setup Awal](#setup-awal)
2. [Konfigurasi](#konfigurasi)
3. [Authentication](#authentication)
4. [Mengirim Pesan](#mengirim-pesan)
5. [Webhook Integration](#webhook-integration)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## 🚀 Setup Awal

### 1. Install Guzzle HTTP Client

```bash
composer require guzzlehttp/guzzle
```

### 2. Buat Service Class

Buat file `app/Services/WhatsAppService.php`:

```php
<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private $client;
    private $baseUrl;
    private $apiKey;
    private $sessionId;

    public function __construct()
    {
        $this->baseUrl = config('whatsapp.api_url');
        $this->apiKey = config('whatsapp.api_key');
        $this->sessionId = config('whatsapp.session_id');
        
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30.0,
            'headers' => [
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ]
        ]);
    }

    /**
     * Kirim pesan text
     */
    public function sendText(string $phone, string $message): array
    {
        try {
            $response = $this->client->post("/api/v1/messages/{$this->sessionId}/send/text", [
                'json' => [
                    'phone' => $this->formatPhone($phone),
                    'message' => $message
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Send Text Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Kirim media (gambar, video, dokumen)
     */
    public function sendMedia(string $phone, string $type, string $filePath, ?string $caption = null): array
    {
        try {
            $multipart = [
                [
                    'name' => 'phone',
                    'contents' => $this->formatPhone($phone)
                ],
                [
                    'name' => 'type',
                    'contents' => $type // image, video, audio, document
                ],
                [
                    'name' => 'file',
                    'contents' => fopen($filePath, 'r'),
                    'filename' => basename($filePath)
                ]
            ];

            if ($caption) {
                $multipart[] = [
                    'name' => 'caption',
                    'contents' => $caption
                ];
            }

            $response = $this->client->post("/api/v1/messages/{$this->sessionId}/send/media", [
                'multipart' => $multipart
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Send Media Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Kirim location
     */
    public function sendLocation(string $phone, float $latitude, float $longitude, ?string $name = null): array
    {
        try {
            $response = $this->client->post("/api/v1/messages/{$this->sessionId}/send/location", [
                'json' => [
                    'phone' => $this->formatPhone($phone),
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'name' => $name
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Send Location Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Kirim contact
     */
    public function sendContact(string $phone, array $contacts): array
    {
        try {
            $response = $this->client->post("/api/v1/messages/{$this->sessionId}/send/contact", [
                'json' => [
                    'phone' => $this->formatPhone($phone),
                    'contacts' => $contacts
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Send Contact Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Kirim button message
     */
    public function sendButton(string $phone, string $text, array $buttons): array
    {
        try {
            $response = $this->client->post("/api/v1/messages/{$this->sessionId}/send/button", [
                'json' => [
                    'phone' => $this->formatPhone($phone),
                    'text' => $text,
                    'buttons' => $buttons
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Send Button Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Kirim list message
     */
    public function sendList(string $phone, string $text, string $buttonText, array $sections): array
    {
        try {
            $response = $this->client->post("/api/v1/messages/{$this->sessionId}/send/list", [
                'json' => [
                    'phone' => $this->formatPhone($phone),
                    'text' => $text,
                    'button_text' => $buttonText,
                    'sections' => $sections
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Send List Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Check nomor WhatsApp
     */
    public function checkNumber(string $phone): array
    {
        try {
            $response = $this->client->get("/api/v1/messages/{$this->sessionId}/check-number", [
                'query' => [
                    'phone' => $this->formatPhone($phone)
                ]
            ]);

            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Check Number Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get session info
     */
    public function getSessionInfo(): array
    {
        try {
            $response = $this->client->get("/api/v1/sessions/{$this->sessionId}");
            return json_decode($response->getBody(), true);
        } catch (GuzzleException $e) {
            Log::error('WhatsApp Get Session Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Format nomor telepon ke format internasional
     */
    private function formatPhone(string $phone): string
    {
        // Hapus semua karakter non-digit
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Jika dimulai dengan 0, ganti dengan 62
        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        }
        
        // Jika tidak dimulai dengan 62, tambahkan 62
        if (substr($phone, 0, 2) !== '62') {
            $phone = '62' . $phone;
        }
        
        return $phone;
    }
}
```

---

## ⚙️ Konfigurasi

### 1. Buat Config File

Buat file `config/whatsapp.php`:

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | WhatsApp API Configuration
    |--------------------------------------------------------------------------
    */

    'api_url' => env('WHATSAPP_API_URL', 'http://localhost:3000'),
    
    'api_key' => env('WHATSAPP_API_KEY'),
    
    'session_id' => env('WHATSAPP_SESSION_ID'),
    
    'webhook_secret' => env('WHATSAPP_WEBHOOK_SECRET'),
    
    'timeout' => env('WHATSAPP_TIMEOUT', 30),
];
```

### 2. Set Environment Variables

Tambahkan ke `.env`:

```env
WHATSAPP_API_URL=https://your-api-domain.com
WHATSAPP_API_KEY=wapi_4f1ae6a6921ba07e130645c8c336a93c2828a432e8d472363487657476f7826e
WHATSAPP_SESSION_ID=your-session-id-here
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Register Service Provider (Optional)

Tambahkan ke `app/Providers/AppServiceProvider.php`:

```php
public function register()
{
    $this->app->singleton(WhatsAppService::class, function ($app) {
        return new WhatsAppService();
    });
}
```

---

## 🔐 Authentication

API menggunakan **API Key** di header `X-API-Key`.

### Cara Mendapatkan API Key:

1. Login ke dashboard WhatsApp API
2. Menu **"API Keys"**
3. Klik **"Create New Key"**
4. Copy API key (hanya ditampilkan sekali!)
5. Simpan di `.env`

---

## 📤 Mengirim Pesan

### 1. Kirim Pesan Text

```php
use App\Services\WhatsAppService;

class OrderController extends Controller
{
    private $whatsapp;

    public function __construct(WhatsAppService $whatsapp)
    {
        $this->whatsapp = $whatsapp;
    }

    public function sendOrderConfirmation($orderId)
    {
        $order = Order::findOrFail($orderId);
        
        $message = "Halo {$order->customer_name},\n\n";
        $message .= "Pesanan Anda #{$order->id} telah dikonfirmasi!\n";
        $message .= "Total: Rp " . number_format($order->total) . "\n\n";
        $message .= "Terima kasih telah berbelanja.";

        try {
            $result = $this->whatsapp->sendText(
                $order->customer_phone,
                $message
            );

            Log::info('WhatsApp sent', ['result' => $result]);
            
            return response()->json([
                'success' => true,
                'message' => 'WhatsApp notification sent'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
```

### 2. Kirim Gambar (Invoice/Receipt)

```php
public function sendInvoice($invoiceId)
{
    $invoice = Invoice::findOrFail($invoiceId);
    
    // Generate PDF invoice
    $pdf = PDF::loadView('invoices.pdf', compact('invoice'));
    $pdfPath = storage_path('app/temp/invoice-' . $invoiceId . '.pdf');
    $pdf->save($pdfPath);

    try {
        $result = $this->whatsapp->sendMedia(
            $invoice->customer_phone,
            'document',
            $pdfPath,
            'Invoice #' . $invoice->number
        );

        // Hapus file temporary
        unlink($pdfPath);

        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
```

### 3. Kirim Button (Menu Pilihan)

```php
public function sendPaymentReminder($orderId)
{
    $order = Order::findOrFail($orderId);
    
    $buttons = [
        ['id' => 'pay_now', 'text' => '💳 Bayar Sekarang'],
        ['id' => 'later', 'text' => '🕐 Nanti'],
        ['id' => 'cancel', 'text' => '❌ Batalkan']
    ];

    $text = "Halo {$order->customer_name},\n\n";
    $text .= "Pesanan Anda menunggu pembayaran.\n";
    $text .= "Total: Rp " . number_format($order->total);

    try {
        $result = $this->whatsapp->sendButton(
            $order->customer_phone,
            $text,
            $buttons
        );

        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
```

### 4. Kirim List (Katalog Produk)

```php
public function sendProductCatalog($customerId)
{
    $customer = Customer::findOrFail($customerId);
    $categories = Category::with('products')->get();

    $sections = [];
    foreach ($categories as $category) {
        $rows = [];
        foreach ($category->products as $product) {
            $rows[] = [
                'id' => 'product_' . $product->id,
                'title' => $product->name,
                'description' => 'Rp ' . number_format($product->price)
            ];
        }

        $sections[] = [
            'title' => $category->name,
            'rows' => $rows
        ];
    }

    try {
        $result = $this->whatsapp->sendList(
            $customer->phone,
            'Katalog Produk Kami',
            'Lihat Produk',
            $sections
        );

        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
```

### 5. Kirim Location (Alamat Toko)

```php
public function sendStoreLocation($customerId)
{
    $customer = Customer::findOrFail($customerId);

    try {
        $result = $this->whatsapp->sendLocation(
            $customer->phone,
            -6.200000,  // Latitude
            106.816666, // Longitude
            'Toko Kami - Jakarta'
        );

        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
```

---

## 🔔 Webhook Integration

Untuk menerima pesan masuk dari WhatsApp.

### 1. Buat Controller

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\WhatsAppMessage;

class WhatsAppWebhookController extends Controller
{
    /**
     * Handle incoming webhook
     */
    public function handle(Request $request)
    {
        // Verify webhook secret
        $secret = $request->header('X-Webhook-Secret');
        if ($secret !== config('whatsapp.webhook_secret')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $event = $request->input('event');
        $data = $request->input('data');

        Log::info('WhatsApp Webhook', ['event' => $event, 'data' => $data]);

        // Handle different events
        switch ($event) {
            case 'message.received':
                $this->handleMessageReceived($data);
                break;

            case 'message.sent':
                $this->handleMessageSent($data);
                break;

            case 'message.read':
                $this->handleMessageRead($data);
                break;

            case 'session.connected':
                $this->handleSessionConnected($data);
                break;

            case 'session.disconnected':
                $this->handleSessionDisconnected($data);
                break;

            default:
                Log::warning('Unknown webhook event: ' . $event);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Handle pesan masuk
     */
    private function handleMessageReceived($data)
    {
        // Simpan ke database
        WhatsAppMessage::create([
            'message_id' => $data['id'],
            'session_id' => $data['sessionId'],
            'from' => $data['from'],
            'message' => $data['message'],
            'type' => $data['type'],
            'timestamp' => $data['timestamp'],
            'direction' => 'incoming'
        ]);

        // Auto-reply logic
        $this->processAutoReply($data);

        // Trigger event untuk processing lebih lanjut
        event(new \App\Events\WhatsAppMessageReceived($data));
    }

    /**
     * Auto-reply logic
     */
    private function processAutoReply($data)
    {
        $message = strtolower($data['message']);
        $from = $data['from'];

        if (strpos($message, 'harga') !== false) {
            $whatsapp = app(WhatsAppService::class);
            $whatsapp->sendText(
                $from,
                "Untuk info harga, silakan hubungi admin kami atau kunjungi website."
            );
        }

        if (strpos($message, 'katalog') !== false) {
            $whatsapp = app(WhatsAppService::class);
            // Send catalog
        }
    }

    private function handleMessageSent($data)
    {
        WhatsAppMessage::where('message_id', $data['id'])
            ->update(['status' => 'sent']);
    }

    private function handleMessageRead($data)
    {
        WhatsAppMessage::where('message_id', $data['id'])
            ->update(['status' => 'read']);
    }

    private function handleSessionConnected($data)
    {
        Log::info('Session connected: ' . $data['sessionId']);
    }

    private function handleSessionDisconnected($data)
    {
        Log::warning('Session disconnected: ' . $data['sessionId']);
    }
}
```

### 2. Buat Route

Tambahkan ke `routes/api.php`:

```php
Route::post('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'handle'])
    ->name('whatsapp.webhook');
```

### 3. Disable CSRF untuk Webhook

Tambahkan ke `app/Http/Middleware/VerifyCsrfToken.php`:

```php
protected $except = [
    'api/webhooks/whatsapp',
];
```

### 4. Buat Migration untuk Messages

```php
php artisan make:migration create_whatsapp_messages_table
```

```php
Schema::create('whatsapp_messages', function (Blueprint $table) {
    $table->id();
    $table->string('message_id')->unique();
    $table->string('session_id');
    $table->string('from');
    $table->string('to')->nullable();
    $table->text('message');
    $table->string('type')->default('text');
    $table->enum('direction', ['incoming', 'outgoing']);
    $table->enum('status', ['pending', 'sent', 'delivered', 'read', 'failed'])->default('pending');
    $table->timestamp('timestamp');
    $table->json('metadata')->nullable();
    $table->timestamps();

    $table->index(['from', 'created_at']);
    $table->index(['session_id', 'created_at']);
});
```

---

## ⚠️ Error Handling

### 1. Custom Exception Handler

```php
<?php

namespace App\Exceptions;

use Exception;

class WhatsAppException extends Exception
{
    public static function sessionNotConnected()
    {
        return new static('WhatsApp session not connected. Please scan QR code.');
    }

    public static function invalidPhoneNumber($phone)
    {
        return new static("Invalid phone number: {$phone}");
    }

    public static function messageLimitReached()
    {
        return new static('Daily message limit reached. Please upgrade your plan.');
    }

    public static function apiError($message)
    {
        return new static("WhatsApp API Error: {$message}");
    }
}
```

### 2. Try-Catch Pattern

```php
use App\Exceptions\WhatsAppException;

public function sendMessage(Request $request)
{
    try {
        $result = $this->whatsapp->sendText(
            $request->phone,
            $request->message
        );

        return response()->json([
            'success' => true,
            'data' => $result
        ]);

    } catch (\GuzzleHttp\Exception\ClientException $e) {
        $response = json_decode($e->getResponse()->getBody(), true);
        
        if ($response['message'] === 'Session not connected') {
            throw WhatsAppException::sessionNotConnected();
        }

        throw WhatsAppException::apiError($response['message']);

    } catch (\Exception $e) {
        Log::error('WhatsApp Error: ' . $e->getMessage());
        
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
}
```

---

## 🎯 Best Practices

### 1. Queue untuk Pengiriman Bulk

```php
<?php

namespace App\Jobs;

use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $phone;
    public $message;

    public function __construct($phone, $message)
    {
        $this->phone = $phone;
        $this->message = $message;
    }

    public function handle(WhatsAppService $whatsapp)
    {
        $whatsapp->sendText($this->phone, $this->message);
    }
}
```

**Penggunaan:**

```php
// Broadcast ke banyak customer
$customers = Customer::where('subscribed', true)->get();

foreach ($customers as $customer) {
    SendWhatsAppMessage::dispatch(
        $customer->phone,
        "Promo spesial untuk Anda!"
    )->delay(now()->addSeconds($customers->search($customer) * 2));
}
```

### 2. Rate Limiting

```php
use Illuminate\Support\Facades\RateLimiter;

public function sendMessage(Request $request)
{
    $key = 'whatsapp-send:' . auth()->id();
    
    if (RateLimiter::tooManyAttempts($key, 30)) {
        return response()->json([
            'error' => 'Too many messages. Please wait.'
        ], 429);
    }

    RateLimiter::hit($key, 60);

    // Send message...
}
```

### 3. Logging & Monitoring

```php
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    public function sendText(string $phone, string $message): array
    {
        $startTime = microtime(true);
        
        try {
            $response = $this->client->post(...);
            
            $duration = microtime(true) - $startTime;
            
            Log::channel('whatsapp')->info('Message sent', [
                'phone' => $phone,
                'duration' => $duration,
                'success' => true
            ]);

            return json_decode($response->getBody(), true);

        } catch (\Exception $e) {
            Log::channel('whatsapp')->error('Send failed', [
                'phone' => $phone,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw $e;
        }
    }
}
```

Tambahkan channel di `config/logging.php`:

```php
'channels' => [
    'whatsapp' => [
        'driver' => 'daily',
        'path' => storage_path('logs/whatsapp.log'),
        'level' => 'debug',
        'days' => 14,
    ],
]
```

### 4. Template Message Helper

```php
<?php

namespace App\Helpers;

class WhatsAppTemplate
{
    public static function orderConfirmation($order)
    {
        return "🎉 Pesanan Dikonfirmasi!\n\n" .
               "No. Order: #{$order->id}\n" .
               "Total: Rp " . number_format($order->total) . "\n" .
               "Status: {$order->status}\n\n" .
               "Terima kasih telah berbelanja! 🙏";
    }

    public static function paymentReminder($invoice)
    {
        return "⏰ Pengingat Pembayaran\n\n" .
               "Invoice: #{$invoice->number}\n" .
               "Jatuh Tempo: {$invoice->due_date->format('d/m/Y')}\n" .
               "Total: Rp " . number_format($invoice->total) . "\n\n" .
               "Mohon segera lakukan pembayaran.";
    }

    public static function shippingUpdate($order)
    {
        return "📦 Update Pengiriman\n\n" .
               "Pesanan #{$order->id} sedang dalam pengiriman.\n" .
               "No. Resi: {$order->tracking_number}\n" .
               "Kurir: {$order->courier}\n\n" .
               "Terima kasih! 🚚";
    }
}
```

**Penggunaan:**

```php
$whatsapp->sendText(
    $order->customer_phone,
    WhatsAppTemplate::orderConfirmation($order)
);
```

---

## 📚 Contoh Use Cases

### 1. E-Commerce - Order Notification

```php
// Event listener
namespace App\Listeners;

use App\Events\OrderCreated;
use App\Services\WhatsAppService;

class SendOrderNotification
{
    private $whatsapp;

    public function __construct(WhatsAppService $whatsapp)
    {
        $this->whatsapp = $whatsapp;
    }

    public function handle(OrderCreated $event)
    {
        $order = $event->order;
        
        $message = "Terima kasih atas pesanan Anda!\n\n";
        $message .= "Order ID: #{$order->id}\n";
        $message .= "Total: Rp " . number_format($order->total) . "\n\n";
        $message .= "Kami akan segera memproses pesanan Anda.";

        $this->whatsapp->sendText($order->customer_phone, $message);
    }
}
```

### 2. Appointment Reminder

```php
// Console Command
namespace App\Console\Commands;

use App\Models\Appointment;
use App\Services\WhatsAppService;
use Illuminate\Console\Command;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:remind';

    public function handle(WhatsAppService $whatsapp)
    {
        $tomorrow = now()->addDay()->startOfDay();
        
        $appointments = Appointment::whereDate('scheduled_at', $tomorrow)
            ->where('reminded', false)
            ->get();

        foreach ($appointments as $appointment) {
            $message = "Pengingat: Anda memiliki janji besok\n";
            $message .= "Waktu: {$appointment->scheduled_at->format('d/m/Y H:i')}\n";
            $message .= "Lokasi: {$appointment->location}";

            $whatsapp->sendText($appointment->customer_phone, $message);
            
            $appointment->update(['reminded' => true]);
        }

        $this->info("Sent {$appointments->count()} reminders");
    }
}
```

Tambahkan ke scheduler (`app/Console/Kernel.php`):

```php
protected function schedule(Schedule $schedule)
{
    $schedule->command('appointments:remind')
             ->dailyAt('09:00');
}
```

---

## 🔧 Testing

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Http;

class WhatsAppServiceTest extends TestCase
{
    public function test_send_text_message()
    {
        Http::fake([
            '*/api/v1/messages/*/send/text' => Http::response([
                'success' => true,
                'data' => ['id' => 'msg_123']
            ], 200)
        ]);

        $whatsapp = new WhatsAppService();
        $result = $whatsapp->sendText('628123456789', 'Test message');

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('data', $result);
    }
}
```

---

## 📞 Support

Jika ada pertanyaan:
- Email: support@whatsapp-api.com
- Documentation: https://docs.whatsapp-api.com
- API Status: https://status.whatsapp-api.com

---

**Happy Coding! 🚀**
