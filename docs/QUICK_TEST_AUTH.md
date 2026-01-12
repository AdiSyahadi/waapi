# Quick Test - WhatsApp API Authentication

## ✅ Credentials yang Benar

Berdasarkan migration file, credentials default yang ada adalah:

```
Email: admin@whatsapp-api.com
Password: Admin@123456
```

## 🧪 Test Login dengan PowerShell

```powershell
# Test 1: Login dan dapatkan token
$loginBody = @{
    email = "admin@whatsapp-api.com"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://72.62.125.132/api/v1/auth/login" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $loginBody
    
    Write-Host "✅ Login berhasil!" -ForegroundColor Green
    Write-Host "Token: $($response.data.token.Substring(0, 50))..." -ForegroundColor Cyan
    
    # Simpan token ke variable
    $token = $response.data.token
    $global:WHATSAPP_TOKEN = $token
    
    Write-Host "`nUser Info:" -ForegroundColor Yellow
    Write-Host "  Name: $($response.data.user.name)"
    Write-Host "  Email: $($response.data.user.email)"
    Write-Host "  Role: $($response.data.user.role)"
    
} catch {
    Write-Host "❌ Login gagal!" -ForegroundColor Red
    Write-Host "Error: $_"
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
}

# Test 2: Create Session dengan token yang didapat
if ($global:WHATSAPP_TOKEN) {
    Write-Host "`n--- Testing Create Session ---" -ForegroundColor Yellow
    
    $sessionBody = @{
        session_id = "laravel-test-" + (Get-Date -Format "yyyyMMddHHmmss")
        webhook_url = "https://yourdomain.com/webhook/whatsapp"
    } | ConvertTo-Json
    
    try {
        $sessionResponse = Invoke-RestMethod -Uri "http://72.62.125.132/api/v1/sessions" `
            -Method POST `
            -Headers @{
                "Content-Type" = "application/json"
                "Authorization" = "Bearer $global:WHATSAPP_TOKEN"
            } `
            -Body $sessionBody
        
        Write-Host "✅ Session created successfully!" -ForegroundColor Green
        Write-Host "Session ID: $($sessionResponse.data.session_id)" -ForegroundColor Cyan
        Write-Host "Status: $($sessionResponse.data.status)" -ForegroundColor Cyan
        
    } catch {
        Write-Host "❌ Create session gagal!" -ForegroundColor Red
        Write-Host "Error: $_"
        if ($_.ErrorDetails.Message) {
            Write-Host "Details: $($_.ErrorDetails.Message)"
        }
    }
}
```

## 🧪 Test Login dengan cURL (Linux/Mac)

```bash
# Test 1: Login
curl -X POST http://72.62.125.132/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@whatsapp-api.com",
    "password": "Admin@123456"
  }' | jq '.'

# Jika berhasil, copy token dari response
# Response example:
# {
#   "success": true,
#   "message": "Login successful",
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "refreshToken": "...",
#     "user": { ... }
#   }
# }

# Test 2: Create session dengan token
TOKEN="paste_your_token_here"

curl -X POST http://72.62.125.132/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "session_id": "laravel-test-001",
    "webhook_url": "https://yourdomain.com/webhook"
  }' | jq '.'
```

## 📋 Checklist Troubleshooting

Jika masih dapat error "Invalid or expired token", cek:

- [ ] **Sudah login?** - Pastikan panggil `/auth/login` terlebih dahulu
- [ ] **Credentials benar?** - Email: `admin@whatsapp-api.com`, Password: `Admin@123456`
- [ ] **Format header benar?** - Harus `Authorization: Bearer <token>`
- [ ] **Token tidak rusak?** - Jangan ada spasi atau karakter tambahan
- [ ] **Server running?** - Cek `http://72.62.125.132/api/v1/health`
- [ ] **JWT_SECRET terisi?** - Cek file `.env` di server
- [ ] **Token belum expired?** - Token valid 24 jam sejak login

## 🔍 Check Token Expiry

```powershell
# Decode JWT token (tanpa verify signature)
function Decode-JWT {
    param($token)
    
    $parts = $token.Split('.')
    if ($parts.Length -ne 3) {
        Write-Host "Invalid JWT format"
        return
    }
    
    # Decode payload (part 1)
    $payload = $parts[1]
    # Add padding if needed
    while ($payload.Length % 4 -ne 0) {
        $payload += "="
    }
    
    $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payload))
    $json = $decoded | ConvertFrom-Json
    
    Write-Host "User ID: $($json.id)"
    Write-Host "Email: $($json.email)"
    Write-Host "Role: $($json.role)"
    
    $issuedAt = [DateTimeOffset]::FromUnixTimeSeconds($json.iat).LocalDateTime
    $expiresAt = [DateTimeOffset]::FromUnixTimeSeconds($json.exp).LocalDateTime
    
    Write-Host "Issued at: $issuedAt"
    Write-Host "Expires at: $expiresAt"
    Write-Host "Is Expired: $(if ((Get-Date) -gt $expiresAt) { 'YES ❌' } else { 'NO ✅' })"
}

# Usage:
# Decode-JWT "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🔄 Re-generate Token Jika Expired

Jika token sudah expired (lebih dari 24 jam), tinggal login lagi:

```powershell
$loginBody = @{
    email = "admin@whatsapp-api.com"
    password = "Admin@123456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://72.62.125.132/api/v1/auth/login" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $loginBody

$newToken = $response.data.token
Write-Host "New token generated: $($newToken.Substring(0, 50))..."
```

## 📝 Update Laravel .env

```env
# Update credentials di Laravel
WHATSAPP_API_URL=http://72.62.125.132/api/v1
WHATSAPP_API_EMAIL=admin@whatsapp-api.com
WHATSAPP_API_PASSWORD=Admin@123456
```

Setelah update .env, service Laravel akan otomatis login dengan credentials yang benar dan token akan di-cache.
