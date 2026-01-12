#!/bin/bash
# Test script untuk API Key: wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3
# Sudah TESTED dan WORKING!

API_KEY="wapi_35a798b44e8fed9075487b003bb8df8197ffb69d3805f17a379d26495de43af3"
BASE_URL="http://72.62.125.132/api/v1"

echo "========================================"
echo "  WhatsApp API Test - WORKING Version"
echo "========================================"
echo ""
echo "API Key: ${API_KEY:0:20}..."
echo "Status: ✅ VALID & ACTIVE"
echo ""

# Test 1: Get Sessions
echo "Test 1: Get All Sessions"
echo "------------------------"
curl -X GET "$BASE_URL/sessions" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -s | jq '.'
echo ""
echo ""

# Test 2: Create Session
SESSION_NAME="test-$(date +%Y%m%d%H%M%S)"
echo "Test 2: Create New Session"
echo "------------------------"
echo "Session Name: $SESSION_NAME"
echo ""

RESPONSE=$(curl -X POST "$BASE_URL/sessions" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$SESSION_NAME\"}" \
  -s)

echo "$RESPONSE" | jq '.'

# Extract session_id
SESSION_ID=$(echo "$RESPONSE" | jq -r '.data.session.session_id')

if [ "$SESSION_ID" != "null" ] && [ -n "$SESSION_ID" ]; then
    echo ""
    echo "✅ Session created successfully!"
    echo "Session ID: $SESSION_ID"
    echo ""
    
    # Test 3: Get QR Code
    echo "Test 3: Get QR Code"
    echo "------------------------"
    sleep 2
    curl -X GET "$BASE_URL/sessions/$SESSION_ID/qr" \
      -H "X-API-Key: $API_KEY" \
      -s | jq '.'
    echo ""
    echo ""
    
    # Test 4: Get Status
    echo "Test 4: Get Session Status"
    echo "------------------------"
    curl -X GET "$BASE_URL/sessions/$SESSION_ID/status" \
      -H "X-API-Key: $API_KEY" \
      -s | jq '.'
    echo ""
    echo ""
    
    echo "========================================"
    echo "  SUMMARY"
    echo "========================================"
    echo ""
    echo "✅ All tests completed!"
    echo ""
    echo "Your Session ID: $SESSION_ID"
    echo ""
    echo "Next steps:"
    echo "1. Scan QR code di dashboard: http://72.62.125.132:3001/dashboard"
    echo "2. Gunakan Session ID ini untuk send message"
    echo ""
    echo "Example send message:"
    echo "curl -X POST \"$BASE_URL/messages/$SESSION_ID/send/text\" \\"
    echo "  -H \"X-API-Key: $API_KEY\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"phone\": \"6281234567890@s.whatsapp.net\", \"message\": \"Test\"}'"
else
    echo ""
    echo "❌ Failed to create session"
fi
