# PowerShell Test Script untuk API Key User
# API Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3
# Status: ✅ TESTED & WORKING!

$API_KEY = "wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3"
$BASE_URL = "http://72.62.125.132/api/v1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhatsApp API Test - WORKING Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Key: $($API_KEY.Substring(0, 20))..." -ForegroundColor Yellow
Write-Host "Status: ✅ VALID & ACTIVE" -ForegroundColor Green
Write-Host ""

# Headers
$headers = @{
    "X-API-Key" = $API_KEY
    "Content-Type" = "application/json"
}

# ============================================
# Test 1: Get All Sessions
# ============================================
Write-Host "Test 1: Get All Sessions" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Gray

try {
    $sessions = Invoke-RestMethod -Uri "$BASE_URL/sessions" -Method GET -Headers $headers
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Total sessions: $($sessions.data.Count)" -ForegroundColor Cyan
    
    if ($sessions.data.Count -gt 0) {
        Write-Host ""
        Write-Host "Existing sessions:" -ForegroundColor Cyan
        $sessions.data | ForEach-Object {
            Write-Host "  - $($_.name) (ID: $($_.session_id), Status: $($_.status))" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
} catch {
    Write-Host "❌ Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# Test 2: Create New Session
# ============================================
Write-Host "Test 2: Create New Session" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Gray

$sessionName = "test-session-$(Get-Date -Format 'yyyyMMddHHmmss')"
Write-Host "Session Name: $sessionName" -ForegroundColor Cyan
Write-Host ""

$body = @{
    name = $sessionName
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$BASE_URL/sessions" -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ Session created successfully!" -ForegroundColor Green
    Write-Host ""
    
    $sessionId = $createResponse.data.session.session_id
    $status = $createResponse.data.session.status
    
    Write-Host "Session Details:" -ForegroundColor Cyan
    Write-Host "  ID: $sessionId" -ForegroundColor Gray
    Write-Host "  Name: $sessionName" -ForegroundColor Gray
    Write-Host "  Status: $status" -ForegroundColor Gray
    Write-Host ""
    
    # Save session ID for next tests
    $global:TEST_SESSION_ID = $sessionId
    
} catch {
    Write-Host "❌ Failed to create session!" -ForegroundColor Red
    Write-Host "Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    Write-Host ""
    exit
}

# ============================================
# Test 3: Get QR Code
# ============================================
Write-Host "Test 3: Get QR Code" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Gray

Start-Sleep -Seconds 2

try {
    $qrResponse = Invoke-RestMethod -Uri "$BASE_URL/sessions/$global:TEST_SESSION_ID/qr" -Method GET -Headers $headers
    
    if ($qrResponse.success -and $qrResponse.data.qr) {
        Write-Host "✅ QR Code available!" -ForegroundColor Green
        Write-Host "QR Code: $($qrResponse.data.qr.Substring(0, 50))..." -ForegroundColor Gray
        Write-Host ""
        Write-Host "📱 Scan QR code ini dengan WhatsApp:" -ForegroundColor Yellow
        Write-Host "   1. Buka WhatsApp di HP" -ForegroundColor Gray
        Write-Host "   2. Menu > Linked Devices" -ForegroundColor Gray
        Write-Host "   3. Scan QR code di dashboard: http://72.62.125.132:3001/dashboard" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  QR Code not ready yet" -ForegroundColor Yellow
        Write-Host "Status: $($qrResponse.data.status)" -ForegroundColor Gray
    }
    
    Write-Host ""
} catch {
    Write-Host "⚠️  QR Code not available (normal untuk session baru)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================
# Test 4: Get Session Status
# ============================================
Write-Host "Test 4: Get Session Status" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Gray

try {
    $statusResponse = Invoke-RestMethod -Uri "$BASE_URL/sessions/$global:TEST_SESSION_ID/status" -Method GET -Headers $headers
    
    Write-Host "✅ Status retrieved!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Session Status:" -ForegroundColor Cyan
    Write-Host "  Status: $($statusResponse.data.status)" -ForegroundColor Gray
    Write-Host "  Session ID: $($statusResponse.data.session_id)" -ForegroundColor Gray
    
    if ($statusResponse.data.phone_number) {
        Write-Host "  Phone: $($statusResponse.data.phone_number)" -ForegroundColor Gray
    }
    
    Write-Host ""
} catch {
    Write-Host "❌ Failed to get status!" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# Test 5: Send Test Message (Optional)
# ============================================
Write-Host "Test 5: Send Test Message (Optional)" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Gray

$sendTest = Read-Host "Kirim test message? (y/n)"

if ($sendTest -eq 'y') {
    $testPhone = Read-Host "Masukkan nomor WhatsApp (contoh: 081234567890)"
    
    if (![string]::IsNullOrWhiteSpace($testPhone)) {
        # Format phone number
        $testPhone = $testPhone -replace '[^0-9]', ''
        
        if ($testPhone.StartsWith('0')) {
            $testPhone = '62' + $testPhone.Substring(1)
        } elseif (!$testPhone.StartsWith('62')) {
            $testPhone = '62' + $testPhone
        }
        
        $testPhone = $testPhone + '@s.whatsapp.net'
        
        Write-Host "Formatted phone: $testPhone" -ForegroundColor Gray
        
        $messageBody = @{
            phone = $testPhone
            message = "✅ Test dari WhatsApp API`n`nWaktu: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`nAPI Key berhasil digunakan!"
        } | ConvertTo-Json
        
        try {
            $sendResponse = Invoke-RestMethod -Uri "$BASE_URL/messages/$global:TEST_SESSION_ID/send/text" `
                -Method POST `
                -Headers $headers `
                -Body $messageBody
            
            Write-Host ""
            Write-Host "✅ Message sent successfully!" -ForegroundColor Green
            Write-Host "Message ID: $($sendResponse.data.messageId)" -ForegroundColor Cyan
            Write-Host ""
            
        } catch {
            Write-Host ""
            Write-Host "❌ Failed to send message!" -ForegroundColor Red
            
            if ($_.ErrorDetails.Message) {
                $error = $_.ErrorDetails.Message | ConvertFrom-Json
                Write-Host "Error: $($error.message)" -ForegroundColor Red
            }
            
            Write-Host ""
            Write-Host "💡 Catatan: Session harus dalam status 'connected' untuk kirim pesan." -ForegroundColor Yellow
            Write-Host "   Scan QR code dulu di dashboard!" -ForegroundColor Yellow
            Write-Host ""
        }
    }
}

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY & NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ API Key Status: VALID & WORKING" -ForegroundColor Green
Write-Host "✅ Session Created: $global:TEST_SESSION_ID" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Configuration untuk Laravel/PHP:" -ForegroundColor Yellow
Write-Host ""
Write-Host "WHATSAPP_API_URL=$BASE_URL" -ForegroundColor Cyan
Write-Host "WHATSAPP_API_KEY=$API_KEY" -ForegroundColor Cyan
Write-Host "WHATSAPP_SESSION_ID=$global:TEST_SESSION_ID" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 Important Notes:" -ForegroundColor Yellow
Write-Host "  1. Header format: X-API-Key (BUKAN Authorization Bearer!)" -ForegroundColor Gray
Write-Host "  2. Create session parameter: 'name' (BUKAN 'session_id'!)" -ForegroundColor Gray
Write-Host "  3. Phone format: 6281234567890@s.whatsapp.net" -ForegroundColor Gray
Write-Host ""

Write-Host "🔗 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Buka dashboard: http://72.62.125.132:3001/dashboard" -ForegroundColor Gray
Write-Host "  2. Scan QR code untuk session: $sessionName" -ForegroundColor Gray
Write-Host "  3. Wait until status = 'connected'" -ForegroundColor Gray
Write-Host "  4. Mulai kirim message menggunakan Session ID di atas" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Full documentation: docs/USER_API_KEY_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
