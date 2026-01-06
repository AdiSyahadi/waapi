# Test Endpoints Script
$baseUrl = "http://localhost:3000/api/v1"

Write-Host "=== Testing WhatsApp API Endpoints ===" -ForegroundColor Cyan

# 1. Test Health
Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
Write-Host "Status: $($health.status)" -ForegroundColor Green

# 2. Test API Info
Write-Host "`n2. Testing API Info..." -ForegroundColor Yellow
$apiInfo = Invoke-RestMethod -Uri "$baseUrl" -Method Get
Write-Host "Message: $($apiInfo.message)" -ForegroundColor Green

# 3. Login
Write-Host "`n3. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = "testuser@example.com"
    password = "Test123456!"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.tokens.accessToken
Write-Host "Login Success! User: $($loginResponse.data.user.name)" -ForegroundColor Green
Write-Host "Token: $($token.Substring(0, 50))..." -ForegroundColor Gray

# 4. Get Profile
Write-Host "`n4. Testing Get Profile..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$profile = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method Get -Headers $headers
Write-Host "Profile: $($profile.data.user.email)" -ForegroundColor Green

# 5. Create Session
Write-Host "`n5. Testing Create Session..." -ForegroundColor Yellow
$sessionBody = @{
    session_id = "test-session-" + (Get-Random -Maximum 9999)
    name = "Test Session"
} | ConvertTo-Json

try {
    $session = Invoke-RestMethod -Uri "$baseUrl/sessions" -Method Post -Body $sessionBody -ContentType "application/json" -Headers $headers
    Write-Host "Session Created: $($session.data.session_id)" -ForegroundColor Green
    $sessionId = $session.data.session_id
    
    # 6. Get QR Code
    Write-Host "`n6. Testing Get QR Code..." -ForegroundColor Yellow
    $qr = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId/qr" -Method Get -Headers $headers
    Write-Host "QR Code Available: $($qr.data.qrCode -ne $null)" -ForegroundColor Green
    
    # 7. Get Session Status
    Write-Host "`n7. Testing Get Session Status..." -ForegroundColor Yellow
    $status = Invoke-RestMethod -Uri "$baseUrl/sessions/$sessionId" -Method Get -Headers $headers
    Write-Host "Status: $($status.data.status)" -ForegroundColor Green
    
    # 8. List Sessions
    Write-Host "`n8. Testing List Sessions..." -ForegroundColor Yellow
    $sessions = Invoke-RestMethod -Uri "$baseUrl/sessions" -Method Get -Headers $headers
    Write-Host "Total Sessions: $($sessions.data.sessions.Count)" -ForegroundColor Green
    
} catch {
    Write-Host "Error in session tests: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# 9. Get Templates
Write-Host "`n9. Testing Get Templates..." -ForegroundColor Yellow
try {
    $templates = Invoke-RestMethod -Uri "$baseUrl/templates" -Method Get -Headers $headers
    Write-Host "Total Templates: $($templates.data.templates.Count)" -ForegroundColor Green
} catch {
    Write-Host "No templates yet (expected)" -ForegroundColor Gray
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
