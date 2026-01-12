# Test WhatsApp API dengan API Key (NO LOGIN REQUIRED!)
# Untuk user CRM - cara SIMPLE!

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhatsApp API Test - API Key Method" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ==============================================
# STEP 1: SET API KEY (Dapatkan dari dashboard)
# ==============================================
Write-Host "Step 1: Masukkan API Key Anda" -ForegroundColor Yellow
Write-Host "Dapatkan dari: http://72.62.125.132:3001/dashboard > API Keys" -ForegroundColor Gray
Write-Host ""

# Uncomment dan isi API Key Anda di sini:
$API_KEY = Read-Host "Masukkan API Key (format: wapi_...)"

if ([string]::IsNullOrWhiteSpace($API_KEY)) {
    Write-Host "❌ API Key tidak boleh kosong!" -ForegroundColor Red
    exit
}

# API Configuration
$BASE_URL = "http://72.62.125.132/api/v1"
$SESSION_ID = "crm-test-" + (Get-Date -Format "yyyyMMddHHmmss")

Write-Host "✅ API Key: $($API_KEY.Substring(0, 15))..." -ForegroundColor Green
Write-Host "✅ Session ID: $SESSION_ID" -ForegroundColor Green
Write-Host ""

# ==============================================
# STEP 2: TEST 1 - Create Session
# ==============================================
Write-Host "Step 2: Create WhatsApp Session" -ForegroundColor Yellow

$sessionBody = @{
    session_id = $SESSION_ID
    webhook_url = "https://yourcrm.com/webhook/whatsapp"
} | ConvertTo-Json

try {
    $sessionResponse = Invoke-RestMethod -Uri "$BASE_URL/sessions" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-API-Key" = $API_KEY
        } `
        -Body $sessionBody
    
    Write-Host "✅ Session created successfully!" -ForegroundColor Green
    Write-Host "   Session ID: $($sessionResponse.data.session_id)" -ForegroundColor Cyan
    Write-Host "   Status: $($sessionResponse.data.status)" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "❌ Failed to create session" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Message: $($errorDetails.message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Pastikan API Key benar (copy dari dashboard)" -ForegroundColor Gray
    Write-Host "   2. Cek format: harus dimulai dengan 'wapi_'" -ForegroundColor Gray
    Write-Host "   3. Pastikan API Key status 'active'" -ForegroundColor Gray
    exit
}

# ==============================================
# STEP 3: TEST 2 - Get QR Code
# ==============================================
Write-Host "Step 3: Get QR Code untuk Scan" -ForegroundColor Yellow

Start-Sleep -Seconds 2

try {
    $qrResponse = Invoke-RestMethod -Uri "$BASE_URL/sessions/$SESSION_ID/qr" `
        -Method GET `
        -Headers @{
            "X-API-Key" = $API_KEY
        }
    
    if ($qrResponse.success) {
        Write-Host "✅ QR Code ready!" -ForegroundColor Green
        Write-Host "   Scan dengan WhatsApp untuk connect" -ForegroundColor Cyan
        Write-Host "   QR: $($qrResponse.data.qr.Substring(0, 50))..." -ForegroundColor Gray
    } else {
        Write-Host "⚠️  QR Code not ready yet" -ForegroundColor Yellow
        Write-Host "   Status: $($qrResponse.data.status)" -ForegroundColor Yellow
    }
    Write-Host ""
    
} catch {
    Write-Host "⚠️  QR Code not ready (normal jika baru dibuat)" -ForegroundColor Yellow
    Write-Host ""
}

# ==============================================
# STEP 4: TEST 3 - Get Session Status
# ==============================================
Write-Host "Step 4: Check Session Status" -ForegroundColor Yellow

try {
    $statusResponse = Invoke-RestMethod -Uri "$BASE_URL/sessions/$SESSION_ID/status" `
        -Method GET `
        -Headers @{
            "X-API-Key" = $API_KEY
        }
    
    Write-Host "✅ Session Status:" -ForegroundColor Green
    Write-Host "   Status: $($statusResponse.data.status)" -ForegroundColor Cyan
    Write-Host "   Session ID: $($statusResponse.data.session_id)" -ForegroundColor Cyan
    
    if ($statusResponse.data.phone_number) {
        Write-Host "   Phone: $($statusResponse.data.phone_number)" -ForegroundColor Cyan
    }
    Write-Host ""
    
} catch {
    Write-Host "❌ Failed to get status" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host ""
}

# ==============================================
# STEP 5: TEST 4 - Send Test Message (Optional)
# ==============================================
Write-Host "Step 5: Send Test Message (Optional)" -ForegroundColor Yellow
$sendTest = Read-Host "Kirim test message? (y/n)"

if ($sendTest -eq 'y') {
    $testPhone = Read-Host "Masukkan nomor WhatsApp tujuan (contoh: 081234567890)"
    
    if (![string]::IsNullOrWhiteSpace($testPhone)) {
        $messageBody = @{
            phone = $testPhone
            message = "Test dari Laravel CRM - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        } | ConvertTo-Json
        
        try {
            $sendResponse = Invoke-RestMethod -Uri "$BASE_URL/messages/$SESSION_ID/send/text" `
                -Method POST `
                -Headers @{
                    "Content-Type" = "application/json"
                    "X-API-Key" = $API_KEY
                } `
                -Body $messageBody
            
            Write-Host "✅ Message sent!" -ForegroundColor Green
            Write-Host "   Message ID: $($sendResponse.data.messageId)" -ForegroundColor Cyan
            Write-Host ""
            
        } catch {
            Write-Host "❌ Failed to send message" -ForegroundColor Red
            Write-Host "   Error: $_" -ForegroundColor Red
            
            if ($_.ErrorDetails.Message) {
                $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
                Write-Host "   Message: $($errorDetails.message)" -ForegroundColor Red
            }
            
            Write-Host ""
            Write-Host "💡 Note: Session harus dalam status 'connected' untuk kirim pesan" -ForegroundColor Yellow
        }
    }
}

# ==============================================
# SUMMARY
# ==============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Test selesai!" -ForegroundColor Green
Write-Host ""
Write-Host "Copy konfigurasi ini ke Laravel .env:" -ForegroundColor Yellow
Write-Host ""
Write-Host "WHATSAPP_API_URL=$BASE_URL" -ForegroundColor Cyan
Write-Host "WHATSAPP_API_KEY=$API_KEY" -ForegroundColor Cyan
Write-Host "WHATSAPP_SESSION_ID=$SESSION_ID" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tidak perlu login lagi! Tinggal pakai API Key ini." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Scan QR code di dashboard: http://72.62.125.132:3001/dashboard" -ForegroundColor Gray
Write-Host "2. Update .env di Laravel dengan config di atas" -ForegroundColor Gray
Write-Host "3. Gunakan WhatsAppService di Laravel (lihat docs/LARAVEL_SIMPLE_GUIDE.md)" -ForegroundColor Gray
Write-Host ""
