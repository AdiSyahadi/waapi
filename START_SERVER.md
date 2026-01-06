# 🚀 Cara Menjalankan WhatsApp API

## Prasyarat
1. ✅ XAMPP MySQL sudah running (port 3306)
2. ✅ Node.js v24.12.0 sudah terinstall
3. ✅ Database `whatsapp_api` sudah dibuat
4. ✅ Migration sudah dijalankan (20 tables)

---

## Cara Start Server

### Option 1: Development Mode (dengan auto-reload)
```bash
npm run dev
```

### Option 2: Production Mode
```bash
npm start
```

Server akan jalan di: **http://localhost:3000**

---

## Test API - Quick Start

### 1️⃣ Buka Swagger Documentation
```
http://localhost:3000/api-docs
```
Di sini kamu bisa test semua endpoint langsung!

### 2️⃣ Test Endpoints Manual

#### A. Register User Baru
```bash
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### B. Login
```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": 1,
      "email": "test@example.com"
    }
  }
}
```

#### C. Create WhatsApp Session (butuh token dari login)
```bash
POST http://localhost:3000/api/v1/sessions/create
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "My First Session",
  "phoneNumber": "6281234567890"
}
```

#### D. Get QR Code
```bash
GET http://localhost:3000/api/v1/sessions/qr/SESSION_ID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "expiresIn": 45
  }
}
```

Scan QR code dengan WhatsApp di HP!

---

## Test Dengan File test-api.http

Buka file `test-api.http` di VS Code dan install extension **REST Client**.

Kemudian tinggal klik tombol "Send Request" di setiap endpoint!

---

## Monitoring

### Check Logs
```bash
# Error logs
tail -f logs/error.log

# Combined logs
tail -f logs/combined.log

# WhatsApp specific logs
tail -f logs/whatsapp.log
```

### Health Check
```bash
GET http://localhost:3000/api/v1/admin/health
```

---

## Troubleshooting

### Server tidak start?
1. Cek MySQL running: `mysql -u root -e "SELECT 1"`
2. Cek port 3000 tidak dipakai: `netstat -ano | findstr :3000`
3. Cek .env file ada dan benar

### QR Code tidak muncul?
1. Pastikan session belum connected
2. Cek folder `sessions/` dibuat otomatis
3. Cek logs di `logs/whatsapp.log`

### Migration error?
```bash
# Reset dan migrate ulang
npm run migrate:fresh
```

---

## Next Steps

1. **Test Basic Flow:**
   - Register → Login → Create Session → Get QR → Scan → Send Message

2. **Explore Swagger:**
   - Buka http://localhost:3000/api-docs
   - Test semua 135 endpoints

3. **Check Analytics:**
   - Login sebagai user
   - GET /api/v1/analytics/dashboard

4. **Test Billing (kalau perlu):**
   - Setup Stripe test keys di .env
   - Test subscription flow

---

## Support

Kalau ada error, cek:
- `logs/error.log` - semua error
- `logs/combined.log` - semua aktivitas
- `logs/whatsapp.log` - WhatsApp specific

Happy Testing! 🚀
