#!/bin/bash
# Quick test script for xpublish server

set -e

echo "🧪 Testing xpublish Server"
echo "=========================="
echo ""

SERVER_URL="http://localhost:9000"

# Test 1: Server health
echo "1️⃣ Testing server health..."
curl -s "$SERVER_URL/" | jq '.' || echo "❌ Server not responding"
echo ""

# Test 2: Dataset info
echo "2️⃣ Getting dataset info..."
curl -s "$SERVER_URL/datasets/ocean/info" | jq '.' || echo "❌ Dataset not found"
echo ""

# Test 3: Zarr metadata
echo "3️⃣ Fetching Zarr metadata..."
curl -s "$SERVER_URL/datasets/ocean/zarr/.zmetadata" | head -n 20
echo "..."
echo ""

# Test 4: Array metadata
echo "4️⃣ Getting array metadata for 'u' variable..."
curl -s "$SERVER_URL/datasets/ocean/zarr/u/.zarray" | jq '.'
echo ""

# Test 5: Chunk request
echo "5️⃣ Testing chunk request..."
CHUNK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/datasets/ocean/zarr/u/0.0.0")
if [ "$CHUNK_STATUS" = "200" ]; then
    echo "✅ Chunk request successful (HTTP $CHUNK_STATUS)"
else
    echo "❌ Chunk request failed (HTTP $CHUNK_STATUS)"
fi
echo ""

# Test 6: CORS headers
echo "6️⃣ Checking CORS headers..."
curl -s -I "$SERVER_URL/datasets/ocean/zarr/.zmetadata" | grep -i "access-control-allow-origin"
echo ""

echo "✅ All tests complete!"
echo ""
echo "💡 Use this in your React app:"
echo "   const zarrUrl = '$SERVER_URL/datasets/ocean/zarr';"
