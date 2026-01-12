# Integrasi WhatsApp API dengan Laravel CRM Donatur

Dokumentasi lengkap untuk mengintegrasikan WhatsApp API dengan sistem CRM Donatur berbasis Laravel.

## 📋 Daftar Isi
1. [Setup Awal](#setup-awal)
2. [Authentication](#authentication)
3. [Session Management](#session-management)
4. [Messaging](#messaging)
5. [Contact Management](#contact-management)
6. [Webhook Integration](#webhook-integration)
7. [Multi-Session Support](#multi-session-support)

---

## Setup Awal

### 1. Install Guzzle HTTP Client
```bash
composer require guzzlehttp/guzzle
```

### 2. Dapatkan API Key

**Langkah-langkah:**
1. Login ke dashboard: `http://72.62.125.132:3001/dashboard`
2. Pergi ke menu **API Keys**
3. Klik **"Create New API Key"**
4. Beri nama: "CRM Production"
5. **COPY API KEY** yang muncul (hanya tampil sekali!)
6. Simpan di `.env` Laravel Anda

### 3. Konfigurasi Environment (.env)
```env
# WhatsApp API Configuration
WHATSAPP_API_URL=http://72.62.125.132/api/v1
WHATSAPP_API_KEY=wapi_your_api_key_here_from_dashboard

# Session ID akan di-generate otomatis atau gunakan yang sudah ada
WHATSAPP_SESSION_ID=crm-production
```

### 4. Create WhatsApp Service Class

**File: `app/Services/WhatsAppService.php`**
```php
<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private Client $client;
    private string $baseUrl;
    private string $apiKey;
    private string $sessionId;

    public function __construct()
    {
        $this->baseUrl = config('services.whatsapp.api_url');
        $this->apiKey = config('services.whatsapp.api_key');
        $this->sessionId = config('services.whatsapp.session_id');
        
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30,
            'headers' => [
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ]
        ]);
    }

    /**
     * Get authorization headers
     */
    private function getHeaders(): array
    {
        return [
            'X-API-Key' => $this->apiKey,
            'Content-Type' => 'application/json',
        ];
    }

    /**
     * Make HTTP request with error handling
     */
    private function makeRequest(string $method, string $endpoint, array $data = [])
    {
        try {
            $options = ['headers' => $this->getHeaders()];
            
            if (!empty($data)) {
                if ($method === 'GET') {
                    $options['query'] = $data;
                } else {
                    $options['json'] = $data;
                }
            }

            $response = $this->client->request($method, $endpoint, $options);
            $body = json_decode($response->getBody()->getContents(), true);

            return [
                'success' => true,
                'data' => $body['data'] ?? $body,
                'message' => $body['message'] ?? 'Success'
            ];

        } catch (GuzzleException $e) {
            Log::error('WhatsApp API Error: ' . $e->getMessage());
            
            return [
                'success' => false,
                'data' => null,
                'message' => $e->getMessage()
            ];
        }
    }
}
```

### 5. Register Service Provider

**File: `config/services.php`**
```php
return [
    // ... existing services
    
    'whatsapp' => [
        'api_url' => env('WHATSAPP_API_URL', 'http://72.62.125.132/api/v1'),
        'api_key' => env('WHATSAPP_API_KEY'),
        'session_id' => env('WHATSAPP_SESSION_ID', 'crm-production'),
    ],
];
```

---

## ✅ SELESAI! Tidak Perlu Login!

**Dengan API Key, Anda TIDAK PERLU:**
- ❌ Login dengan email/password
- ❌ Manage JWT tokens
- ❌ Handle token expiration
- ❌ Store tokens di cache

**Cukup gunakan API Key di header setiap request!**

---

## Quick Start - Langsung Pakai!

### Test Koneksi (Optional)

**Method di WhatsAppService:**
```php
/**
 * Test API connection
 */
public function testConnection(): array
{
    return $this->makeRequest('GET', '/sessions');
}
public function saveToken(string $token): void
{
    Cache::put('whatsapp_api_token', $token, now()->addHours(24));
    $this->token = $token;
}

/**
 * Get current token
 */
public function getToken(): ?string
{
    return Cache::get('whatsapp_api_token') ?? $this->token;
}
```

**Controller Example:**
```php
public function connectWhatsApp(Request $request)
{
    $whatsapp = new WhatsAppService();
    
    $result = $whatsapp->login(
        $request->email,
        $request->password
    );
    
    if ($result['success']) {
        $whatsapp->saveToken($result['data']['token']);
        return response()->json(['message' => 'Connected successfully']);
    }
    
    return response()->json(['message' => 'Failed to connect'], 400);
}
```

---

## Session Management

### 1. Create/Connect Session

```php
/**
 * Create new WhatsApp session
 */
public function createSession(string $sessionName): array
{
    return $this->makeRequest('POST', '/sessions', [
        'session_id' => $sessionName,
        'webhook_url' => route('webhook.whatsapp')
    ]);
}

/**
 * Get QR Code untuk scan
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
 * Disconnect session
 */
public function disconnectSession(string $sessionId): array
{
    return $this->makeRequest('DELETE', "/sessions/{$sessionId}");
}

/**
 * Get all sessions
 */
public function getAllSessions(): array
{
    return $this->makeRequest('GET', '/sessions');
}
```

**Controller:**
```php
class WhatsAppSessionController extends Controller
{
    private WhatsAppService $whatsapp;

    public function __construct(WhatsAppService $whatsapp)
    {
        $this->whatsapp = $whatsapp;
    }

    public function create(Request $request)
    {
        $validated = $request->validate([
            'session_name' => 'required|string|unique:whatsapp_sessions,session_id'
        ]);

        $result = $this->whatsapp->createSession($validated['session_name']);

        if ($result['success']) {
            // Save to database
            WhatsAppSession::create([
                'session_id' => $validated['session_name'],
                'status' => 'connecting',
                'user_id' => auth()->id()
            ]);

            return response()->json($result);
        }

        return response()->json($result, 400);
    }

    public function getQR(string $sessionId)
    {
        $result = $this->whatsapp->getQRCode($sessionId);
        return response()->json($result);
    }

    public function status(string $sessionId)
    {
        $result = $this->whatsapp->getSessionStatus($sessionId);
        
        // Update database
        if ($result['success']) {
            WhatsAppSession::where('session_id', $sessionId)
                ->update(['status' => $result['data']['status']]);
        }

        return response()->json($result);
    }
}
```

---

## Messaging

### 1. Get Conversations (Inbox)

```php
/**
 * Get all conversations dengan filtering
 */
public function getConversations(string $sessionId, array $filters = []): array
{
    return $this->makeRequest('GET', "/sessions/{$sessionId}/chats", $filters);
}

/**
 * Get messages from specific chat
 */
public function getMessages(string $sessionId, string $chatId, int $limit = 50): array
{
    return $this->makeRequest('GET', "/sessions/{$sessionId}/messages", [
        'chatId' => $chatId,
        'limit' => $limit
    ]);
}

/**
 * Search conversations
 */
public function searchConversations(string $sessionId, string $query): array
{
    return $this->makeRequest('GET', "/sessions/{$sessionId}/chats/search", [
        'query' => $query
    ]);
}
```

**Controller untuk CRM Inbox:**
```php
class InboxController extends Controller
{
    public function index(Request $request)
    {
        $whatsapp = new WhatsAppService();
        $sessionId = config('services.whatsapp.session_id');

        // Get filters from request
        $filters = [
            'filter' => $request->get('filter', 'all'), // all, unread, starred
            'search' => $request->get('search'),
            'limit' => $request->get('limit', 50)
        ];

        $result = $whatsapp->getConversations($sessionId, $filters);

        if ($result['success']) {
            // Enrich with donatur data
            $conversations = collect($result['data'])->map(function ($chat) {
                $donatur = Donatur::where('phone', $chat['phone'])->first();
                
                return [
                    'id' => $chat['id'],
                    'name' => $chat['name'],
                    'phone' => $chat['phone'],
                    'last_message' => $chat['last_message'],
                    'timestamp' => $chat['timestamp'],
                    'unread_count' => $chat['unread_count'],
                    'is_starred' => $chat['is_starred'] ?? false,
                    
                    // Donatur CRM data
                    'donatur' => $donatur ? [
                        'lifetime_value' => $donatur->lifetime_value,
                        'donation_count' => $donatur->donation_count,
                        'avg_donation' => $donatur->avg_donation,
                        'last_donation' => $donatur->last_donation_date,
                        'segment' => $donatur->segment, // VIP, Loyal, New
                        'engagement_score' => $donatur->engagement_score
                    ] : null
                ];
            });

            return response()->json([
                'success' => true,
                'conversations' => $conversations
            ]);
        }

        return response()->json($result, 400);
    }

    public function show(Request $request, string $chatId)
    {
        $whatsapp = new WhatsAppService();
        $sessionId = config('services.whatsapp.session_id');

        $result = $whatsapp->getMessages($sessionId, $chatId);

        return response()->json($result);
    }
}
```

### 2. Send Messages

```php
/**
 * Send text message
 */
public function sendTextMessage(string $sessionId, string $phone, string $message): array
{
    return $this->makeRequest('POST', "/sessions/{$sessionId}/messages/text", [
        'phone' => $phone,
        'message' => $message
    ]);
}

/**
 * Send image
 */
public function sendImage(string $sessionId, string $phone, string $imagePath, string $caption = ''): array
{
    return $this->makeRequest('POST', "/sessions/{$sessionId}/messages/image", [
        'phone' => $phone,
        'image' => $imagePath,
        'caption' => $caption
    ]);
}

/**
 * Send document
 */
public function sendDocument(string $sessionId, string $phone, string $filePath, string $filename): array
{
    return $this->makeRequest('POST', "/sessions/{$sessionId}/messages/document", [
        'phone' => $phone,
        'document' => $filePath,
        'filename' => $filename
    ]);
}

/**
 * Send template message
 */
public function sendTemplate(string $sessionId, string $phone, string $templateId, array $variables = []): array
{
    return $this->makeRequest('POST', "/sessions/{$sessionId}/messages/template", [
        'phone' => $phone,
        'template_id' => $templateId,
        'variables' => $variables
    ]);
}
```

**Controller:**
```php
class MessageController extends Controller
{
    public function send(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string',
            'type' => 'in:text,image,document',
            'file' => 'nullable|file'
        ]);

        $whatsapp = new WhatsAppService();
        $sessionId = config('services.whatsapp.session_id');

        if ($validated['type'] === 'text') {
            $result = $whatsapp->sendTextMessage(
                $sessionId,
                $validated['phone'],
                $validated['message']
            );
        } elseif ($validated['type'] === 'image' && $request->hasFile('file')) {
            $path = $request->file('file')->store('whatsapp/images', 'public');
            $result = $whatsapp->sendImage(
                $sessionId,
                $validated['phone'],
                storage_path('app/public/' . $path),
                $validated['message']
            );
        }

        if ($result['success']) {
            // Log message to database
            Message::create([
                'donatur_id' => Donatur::where('phone', $validated['phone'])->first()?->id,
                'message' => $validated['message'],
                'type' => $validated['type'],
                'direction' => 'outgoing',
                'status' => 'sent',
                'cs_id' => auth()->id()
            ]);
        }

        return response()->json($result);
    }

    public function sendQuickReply(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required',
            'template_id' => 'required|exists:message_templates,id'
        ]);

        $template = MessageTemplate::find($validated['template_id']);
        $whatsapp = new WhatsAppService();

        $result = $whatsapp->sendTextMessage(
            config('services.whatsapp.session_id'),
            $validated['phone'],
            $template->content
        );

        return response()->json($result);
    }
}
```

### 3. Mark as Read

```php
/**
 * Mark chat as read
 */
public function markAsRead(string $sessionId, string $chatId): array
{
    return $this->makeRequest('POST', "/sessions/{$sessionId}/chats/{$chatId}/read");
}
```

---

## Contact Management

```php
/**
 * Get contact info
 */
public function getContactInfo(string $sessionId, string $phone): array
{
    return $this->makeRequest('GET', "/sessions/{$sessionId}/contacts/{$phone}");
}

/**
 * Check if number is registered on WhatsApp
 */
public function checkNumberRegistered(string $sessionId, string $phone): array
{
    return $this->makeRequest('GET', "/sessions/{$sessionId}/contacts/{$phone}/check");
}

/**
 * Get contact profile picture
 */
public function getProfilePicture(string $sessionId, string $phone): array
{
    return $this->makeRequest('GET', "/sessions/{$sessionId}/contacts/{$phone}/picture");
}
```

**Controller:**
```php
public function getProfile(string $phone)
{
    $whatsapp = new WhatsAppService();
    $sessionId = config('services.whatsapp.session_id');

    // Get WhatsApp info
    $waInfo = $whatsapp->getContactInfo($sessionId, $phone);
    
    // Get CRM data
    $donatur = Donatur::where('phone', $phone)
        ->with(['donations', 'notes', 'reminders'])
        ->first();

    return response()->json([
        'whatsapp' => $waInfo['data'] ?? null,
        'donatur' => $donatur,
        'metrics' => [
            'lifetime_value' => $donatur->donations->sum('amount'),
            'donation_count' => $donatur->donations->count(),
            'avg_donation' => $donatur->donations->avg('amount'),
            'last_donation' => $donatur->donations->latest()->first()?->created_at,
            'engagement_score' => $this->calculateEngagementScore($donatur)
        ]
    ]);
}
```

---

## Webhook Integration

### 1. Setup Webhook

**Route: `routes/api.php`**
```php
Route::post('/webhook/whatsapp', [WebhookController::class, 'handle'])
    ->name('webhook.whatsapp');
```

**Controller: `app/Http/Controllers/WebhookController.php`**
```php
<?php

namespace App\Http\Controllers;

use App\Models\Donatur;
use App\Models\Message;
use App\Events\NewMessageReceived;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    public function handle(Request $request)
    {
        $event = $request->input('event');
        $data = $request->input('data');

        switch ($event) {
            case 'message.received':
                $this->handleIncomingMessage($data);
                break;

            case 'message.status':
                $this->handleMessageStatus($data);
                break;

            case 'session.status':
                $this->handleSessionStatus($data);
                break;

            case 'typing':
                $this->handleTypingStatus($data);
                break;
        }

        return response()->json(['success' => true]);
    }

    private function handleIncomingMessage(array $data)
    {
        // Find or create donatur
        $donatur = Donatur::firstOrCreate(
            ['phone' => $data['from']],
            [
                'name' => $data['pushName'] ?? 'Unknown',
                'segment' => 'New'
            ]
        );

        // Save message
        $message = Message::create([
            'donatur_id' => $donatur->id,
            'message' => $data['message'],
            'type' => $data['type'] ?? 'text',
            'direction' => 'incoming',
            'status' => 'delivered',
            'wa_message_id' => $data['id'],
            'timestamp' => $data['timestamp']
        ]);

        // Broadcast to CS yang handle
        broadcast(new NewMessageReceived($message));

        // Auto-reply untuk donatur baru
        if ($donatur->wasRecentlyCreated) {
            $this->sendWelcomeMessage($donatur);
        }
    }

    private function handleMessageStatus(array $data)
    {
        Message::where('wa_message_id', $data['id'])
            ->update(['status' => $data['status']]);
    }

    private function handleSessionStatus(array $data)
    {
        WhatsAppSession::where('session_id', $data['sessionId'])
            ->update(['status' => $data['status']]);

        // Notify CS via broadcast
        broadcast(new SessionStatusChanged($data));
    }

    private function handleTypingStatus(array $data)
    {
        // Broadcast typing indicator ke CS
        broadcast(new DonaturTyping($data['from'], $data['isTyping']));
    }

    private function sendWelcomeMessage(Donatur $donatur)
    {
        $whatsapp = new WhatsAppService();
        
        $message = "Halo {$donatur->name}! 👋\n\n" .
                   "Terima kasih telah menghubungi kami. " .
                   "Tim kami akan segera membalas pesan Anda.";

        $whatsapp->sendTextMessage(
            config('services.whatsapp.session_id'),
            $donatur->phone,
            $message
        );
    }
}
```

### 2. Real-time Events dengan Laravel Echo

**Install Dependencies:**
```bash
composer require pusher/pusher-php-server
npm install --save laravel-echo pusher-js
```

**Event: `app/Events/NewMessageReceived.php`**
```php
<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewMessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct(Message $message)
    {
        $this->message = $message;
    }

    public function broadcastOn()
    {
        return new Channel('inbox');
    }

    public function broadcastWith()
    {
        return [
            'message' => $this->message->load('donatur'),
            'timestamp' => now()
        ];
    }
}
```

---

## Multi-Session Support

### Database Migration

```php
Schema::create('whatsapp_sessions', function (Blueprint $table) {
    $table->id();
    $table->string('session_id')->unique();
    $table->foreignId('user_id')->constrained(); // CS yang handle
    $table->string('name'); // CS Name atau Session Name
    $table->enum('status', ['connected', 'connecting', 'disconnected'])->default('disconnected');
    $table->string('phone_number')->nullable();
    $table->integer('active_chats')->default(0);
    $table->timestamp('last_activity')->nullable();
    $table->timestamps();
});
```

### Model

```php
class WhatsAppSession extends Model
{
    protected $fillable = [
        'session_id', 'user_id', 'name', 'status', 
        'phone_number', 'active_chats', 'last_activity'
    ];

    protected $casts = [
        'last_activity' => 'datetime'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isConnected(): bool
    {
        return $this->status === 'connected';
    }

    public function updateActiveChats()
    {
        $whatsapp = new WhatsAppService();
        $result = $whatsapp->getConversations($this->session_id, ['filter' => 'unread']);
        
        if ($result['success']) {
            $this->update([
                'active_chats' => count($result['data']),
                'last_activity' => now()
            ]);
        }
    }
}
```

### Controller untuk CS Dashboard

```php
class CSDashboardController extends Controller
{
    public function index()
    {
        $sessions = WhatsAppSession::with('user')
            ->where('user_id', auth()->id())
            ->get();

        foreach ($sessions as $session) {
            $session->updateActiveChats();
        }

        return response()->json([
            'sessions' => $sessions,
            'summary' => [
                'total_sessions' => $sessions->count(),
                'connected' => $sessions->where('status', 'connected')->count(),
                'total_active_chats' => $sessions->sum('active_chats')
            ]
        ]);
    }

    public function switchSession(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|exists:whatsapp_sessions,session_id'
        ]);

        session(['active_whatsapp_session' => $validated['session_id']]);

        return response()->json([
            'success' => true,
            'message' => 'Session switched'
        ]);
    }
}
```

---

## Complete Laravel Example

### Routes

```php
// routes/api.php
Route::prefix('crm')->middleware(['auth:sanctum'])->group(function () {
    
    // Sessions
    Route::prefix('whatsapp/sessions')->group(function () {
        Route::get('/', [WhatsAppSessionController::class, 'index']);
        Route::post('/', [WhatsAppSessionController::class, 'create']);
        Route::get('/{sessionId}/qr', [WhatsAppSessionController::class, 'getQR']);
        Route::get('/{sessionId}/status', [WhatsAppSessionController::class, 'status']);
        Route::delete('/{sessionId}', [WhatsAppSessionController::class, 'destroy']);
    });

    // Inbox & Messages
    Route::prefix('inbox')->group(function () {
        Route::get('/', [InboxController::class, 'index']);
        Route::get('/{chatId}', [InboxController::class, 'show']);
        Route::post('/{chatId}/read', [InboxController::class, 'markAsRead']);
        Route::post('/{chatId}/star', [InboxController::class, 'toggleStar']);
    });

    // Send Messages
    Route::prefix('messages')->group(function () {
        Route::post('/send', [MessageController::class, 'send']);
        Route::post('/template', [MessageController::class, 'sendTemplate']);
        Route::post('/quick-reply', [MessageController::class, 'sendQuickReply']);
    });

    // Contacts & Donatur
    Route::prefix('contacts')->group(function () {
        Route::get('/{phone}', [ContactController::class, 'show']);
        Route::post('/{phone}/notes', [ContactController::class, 'addNote']);
        Route::post('/{phone}/reminders', [ContactController::class, 'setReminder']);
        Route::post('/{phone}/donations', [ContactController::class, 'logDonation']);
    });

    // CS Dashboard
    Route::get('/dashboard', [CSDashboardController::class, 'index']);
    Route::post('/switch-session', [CSDashboardController::class, 'switchSession']);
});

// Webhook
Route::post('/webhook/whatsapp', [WebhookController::class, 'handle']);
```

---

## Frontend Integration (Vue/React)

### Axios Setup

```javascript
// resources/js/api/whatsapp.js
import axios from 'axios';

const api = axios.create({
    baseURL: '/api/crm',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    }
});

export const whatsappAPI = {
    // Inbox
    getConversations: (filters) => api.get('/inbox', { params: filters }),
    getMessages: (chatId) => api.get(`/inbox/${chatId}`),
    markAsRead: (chatId) => api.post(`/inbox/${chatId}/read`),

    // Send
    sendMessage: (data) => api.post('/messages/send', data),
    sendTemplate: (data) => api.post('/messages/template', data),

    // Sessions
    getSessions: () => api.get('/whatsapp/sessions'),
    getQR: (sessionId) => api.get(`/whatsapp/sessions/${sessionId}/qr`),
    getStatus: (sessionId) => api.get(`/whatsapp/sessions/${sessionId}/status`),

    // Contact
    getProfile: (phone) => api.get(`/contacts/${phone}`),
    addNote: (phone, note) => api.post(`/contacts/${phone}/notes`, { note }),
};
```

### Usage in Vue Component

```vue
<template>
  <div class="inbox">
    <div class="conversations">
      <div v-for="chat in conversations" :key="chat.id" 
           @click="selectChat(chat)"
           :class="{ active: selectedChat?.id === chat.id }">
        <div class="avatar">{{ chat.name.charAt(0) }}</div>
        <div class="info">
          <h4>{{ chat.name }}</h4>
          <p>{{ chat.last_message }}</p>
          <span class="badge" v-if="chat.donatur">{{ chat.donatur.segment }}</span>
        </div>
        <div class="meta">
          <span class="time">{{ formatTime(chat.timestamp) }}</span>
          <span class="unread" v-if="chat.unread_count">{{ chat.unread_count }}</span>
        </div>
      </div>
    </div>

    <div class="messages" v-if="selectedChat">
      <div class="header">
        <h3>{{ selectedChat.name }}</h3>
        <div class="metrics" v-if="selectedChat.donatur">
          <span>💰 {{ formatCurrency(selectedChat.donatur.lifetime_value) }}</span>
          <span>📊 {{ selectedChat.donatur.donation_count }} donations</span>
        </div>
      </div>

      <div class="message-list">
        <div v-for="msg in messages" :key="msg.id" 
             :class="['message', msg.direction]">
          {{ msg.message }}
          <span class="time">{{ formatTime(msg.timestamp) }}</span>
        </div>
      </div>

      <div class="input-box">
        <textarea v-model="newMessage" @keyup.ctrl.enter="sendMessage"></textarea>
        <button @click="sendMessage">Kirim</button>
      </div>
    </div>
  </div>
</template>

<script>
import { whatsappAPI } from '@/api/whatsapp';

export default {
  data() {
    return {
      conversations: [],
      selectedChat: null,
      messages: [],
      newMessage: ''
    }
  },
  
  mounted() {
    this.loadConversations();
    this.setupWebSocket();
  },

  methods: {
    async loadConversations() {
      const response = await whatsappAPI.getConversations();
      this.conversations = response.data.conversations;
    },

    async selectChat(chat) {
      this.selectedChat = chat;
      const response = await whatsappAPI.getMessages(chat.id);
      this.messages = response.data.messages;
      
      // Mark as read
      await whatsappAPI.markAsRead(chat.id);
    },

    async sendMessage() {
      if (!this.newMessage.trim()) return;

      await whatsappAPI.sendMessage({
        phone: this.selectedChat.phone,
        message: this.newMessage,
        type: 'text'
      });

      this.newMessage = '';
      this.selectChat(this.selectedChat); // Reload messages
    },

    setupWebSocket() {
      Echo.channel('inbox')
        .listen('NewMessageReceived', (e) => {
          // Update conversations list
          this.loadConversations();
          
          // If message is for current chat, add to messages
          if (this.selectedChat?.phone === e.message.donatur.phone) {
            this.messages.push(e.message);
          }
        });
    }
  }
}
</script>
```

---

## Error Handling & Best Practices

### 1. Retry Logic untuk Failed Messages

```php
use Illuminate\Support\Facades\Queue;
use App\Jobs\SendWhatsAppMessage;

// Gunakan queue untuk reliability
Queue::push(new SendWhatsAppMessage($phone, $message));
```

**Job:**
```php
class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = [10, 30, 60]; // seconds

    protected $phone;
    protected $message;

    public function __construct($phone, $message)
    {
        $this->phone = $phone;
        $this->message = $message;
    }

    public function handle(WhatsAppService $whatsapp)
    {
        $result = $whatsapp->sendTextMessage(
            config('services.whatsapp.session_id'),
            $this->phone,
            $this->message
        );

        if (!$result['success']) {
            throw new \Exception($result['message']);
        }
    }
}
```

### 2. Rate Limiting

```php
use Illuminate\Support\Facades\RateLimiter;

public function send(Request $request)
{
    $key = 'send-message:' . auth()->id();
    
    if (RateLimiter::tooManyAttempts($key, 30)) { // 30 per minute
        return response()->json([
            'message' => 'Too many messages. Please wait.'
        ], 429);
    }

    RateLimiter::hit($key, 60);
    
    // Send message...
}
```

### 3. Monitoring & Logging

```php
use Illuminate\Support\Facades\Log;

Log::channel('whatsapp')->info('Message sent', [
    'phone' => $phone,
    'cs_id' => auth()->id(),
    'session_id' => $sessionId
]);
```

---

## Testing

```php
// tests/Feature/WhatsAppTest.php
class WhatsAppTest extends TestCase
{
    public function test_can_send_message()
    {
        $response = $this->postJson('/api/crm/messages/send', [
            'phone' => '6282119499306',
            'message' => 'Test message',
            'type' => 'text'
        ]);

        $response->assertStatus(200)
                 ->assertJson(['success' => true]);
    }

    public function test_can_get_conversations()
    {
        $response = $this->getJson('/api/crm/inbox');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'conversations' => [
                         '*' => ['id', 'name', 'phone', 'last_message']
                     ]
                 ]);
    }
}
```

---

## Production Checklist

- [ ] SSL/HTTPS untuk webhook
- [ ] Queue untuk message sending
- [ ] Rate limiting implemented
- [ ] Error monitoring (Sentry/Bugsnag)
- [ ] Database backup
- [ ] Session reconnection handling
- [ ] Message retry logic
- [ ] Webhook signature validation
- [ ] Load testing
- [ ] Documentation untuk tim

---

## Support & Troubleshooting

**Common Issues:**

1. **Session disconnected:** Check `/sessions/{id}/status` dan reconnect jika perlu
2. **Message tidak terkirim:** Cek queue worker dengan `php artisan queue:work`
3. **Webhook tidak received:** Test dengan ngrok untuk local development
4. **Rate limit exceeded:** Implement queue dan backoff strategy

**Contact:**
- API URL: http://72.62.125.132/api/v1
- Documentation: http://72.62.125.132/api/docs

---

*Dokumentasi ini dibuat untuk integrasi WhatsApp API dengan Laravel CRM Donatur. Update terakhir: {{ date('Y-m-d') }}*
