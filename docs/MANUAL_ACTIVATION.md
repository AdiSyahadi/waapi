# Manual Subscription Activation - Admin Guide

## Overview
Fitur ini memungkinkan admin untuk mengaktifkan subscription secara manual, berguna untuk kasus:
- Transfer bank manual
- Pembayaran di luar Midtrans
- Aktivasi khusus/promosi

## Endpoint

### POST /api/v1/admin/subscriptions/activate-manual

**Authentication Required:** Yes (Admin only)

**Request Body:**
```json
{
  "user_id": 1,
  "plan_id": 2,
  "payment_method": "bank_transfer",
  "amount_paid": 100000,
  "payment_reference": "TRF-20241223-001",
  "transfer_proof_url": "https://example.com/bukti-transfer.jpg",
  "notes": "Transfer BCA ke rekening perusahaan",
  "duration_days": 30
}
```

**Parameters:**
- `user_id` (required): ID user yang akan diaktifkan subscription-nya
- `plan_id` (required): ID plan yang akan diaktifkan
- `payment_method` (optional): Metode pembayaran, default "bank_transfer"
- `amount_paid` (optional): Jumlah yang dibayar, default sesuai harga plan
- `payment_reference` (optional): Nomor referensi pembayaran/transfer
- `transfer_proof_url` (optional): URL bukti transfer
- `notes` (optional): Catatan tambahan
- `duration_days` (optional): Durasi subscription dalam hari, default 30

**Response Success:**
```json
{
  "success": true,
  "message": "Subscription activated successfully for user@email.com",
  "data": {
    "subscription": {
      "id": 123,
      "user_id": 1,
      "plan_id": 2,
      "status": "active",
      "current_period_start": "2024-12-23T10:00:00.000Z",
      "current_period_end": "2025-01-22T10:00:00.000Z",
      "expires_at": "2025-01-22T10:00:00.000Z"
    },
    "invoice": {
      "id": 456,
      "invoice_number": "INV-MANUAL-1-1703329200000",
      "amount": 100000,
      "currency": "IDR",
      "status": "paid",
      "payment_method": "bank_transfer",
      "paid_at": "2024-12-23T10:00:00.000Z"
    },
    "user": {
      "id": 1,
      "name": "User Name",
      "email": "user@email.com"
    },
    "plan": {
      "id": 2,
      "name": "Professional",
      "price": 100000
    }
  }
}
```

## Cara Penggunaan

### 1. Dapatkan User ID
Cari user yang akan diaktifkan:
```bash
GET /api/v1/admin/users?search=email@user.com
```

### 2. Dapatkan Plan ID
Lihat daftar plan yang tersedia:
```bash
GET /api/v1/admin/plans
```

### 3. Aktivasi Manual
Kirim request aktivasi dengan curl:
```bash
curl -X POST http://localhost:3000/api/v1/admin/subscriptions/activate-manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "user_id": 1,
    "plan_id": 2,
    "payment_method": "bank_transfer",
    "amount_paid": 100000,
    "payment_reference": "TRF-BCA-20241223-001",
    "transfer_proof_url": "https://storage.example.com/proof/transfer123.jpg",
    "notes": "Transfer manual ke BCA a/n PT XYZ",
    "duration_days": 30
  }'
```

Atau dengan PowerShell:
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
}

$body = @{
    user_id = 1
    plan_id = 2
    payment_method = "bank_transfer"
    amount_paid = 100000
    payment_reference = "TRF-BCA-20241223-001"
    transfer_proof_url = "https://storage.example.com/proof/transfer123.jpg"
    notes = "Transfer manual ke BCA a/n PT XYZ"
    duration_days = 30
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/v1/admin/subscriptions/activate-manual" -Headers $headers -Body $body
```

## Yang Terjadi Saat Aktivasi Manual

1. **Validasi** - System memvalidasi user dan plan exist
2. **Create/Update Subscription** - Subscription dibuat atau diupdate dengan status 'active'
3. **Set Periode** - Set periode subscription sesuai duration_days
4. **Create Invoice** - Buat invoice dengan status 'paid'
5. **Update User** - Update subscription_id dan plan_id di user
6. **Audit Log** - Catat aktivitas admin di audit log

## Metadata yang Disimpan

Invoice akan menyimpan metadata berikut:
```json
{
  "activated_by_admin": 1,
  "admin_name": "Admin Name",
  "transfer_proof_url": "https://...",
  "notes": "Catatan admin",
  "manual_activation": true
}
```

## Audit Trail

Setiap aktivasi manual akan tercatat di audit log dengan:
- Action: `admin.subscription.manual_activate`
- Resource type: `subscription`
- Description: Detail user dan plan
- Metadata: Semua informasi pembayaran

## Tips

1. **Simpan Bukti Transfer** - Upload bukti transfer ke storage dan simpan URL-nya
2. **Gunakan Referensi Unik** - Buat payment_reference yang unik untuk tracking
3. **Tambahkan Notes** - Catat detail pembayaran untuk referensi
4. **Cek Audit Log** - Selalu review audit log untuk aktivasi manual

## Perbedaan dengan Aktivasi Otomatis (Midtrans)

| Fitur | Manual | Midtrans |
|-------|--------|----------|
| Trigger | Admin action | Webhook notification |
| Verifikasi | Manual oleh admin | Otomatis |
| Payment Reference | Input manual | Order ID Midtrans |
| Bukti Bayar | Upload manual | Dari Midtrans |
| Audit | Tercatat admin | Tercatat system |

## Security

- Endpoint hanya bisa diakses oleh user dengan role `admin`
- Menggunakan middleware `authenticate` dan `requireAdmin`
- Semua aktivitas tercatat di audit log
- Transaction database untuk data consistency
