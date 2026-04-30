#!/bin/bash
# 🔍 Test Connection Between React App and xpublish Server

echo "🧪 Testing Ocean Visualization Stack"
echo "===================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

SERVER_URL="http://localhost:9000"
REACT_URL="http://localhost:3000"

# Test 1: Check if server is running
echo "1️⃣ Testing xpublish server..."
if curl -s "$SERVER_URL/" > /dev/null 2>&1; then
    print_success "Server is running at $SERVER_URL"
    
    # Get server info
    SERVER_INFO=$(curl -s "$SERVER_URL/" | python3 -m json.tool 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "$SERVER_INFO" | head -10
    fi
else
    print_error "Server is not running at $SERVER_URL"
    echo ""
    echo "Start the server with:"
    echo "  cd /home/kishank/ocean-plugin/plugin/widget5"
    echo "  ./start-server.sh"
    exit 1
fi
echo ""

# Test 2: Check dataset
echo "2️⃣ Testing dataset availability..."
DATASET_INFO=$(curl -s "$SERVER_URL/datasets/ocean/info")
if [ $? -eq 0 ]; then
    print_success "Dataset 'ocean' is available"
    echo "$DATASET_INFO" | python3 -m json.tool | head -15
else
    print_error "Dataset 'ocean' not found"
    exit 1
fi
echo ""

# Test 3: Check Zarr metadata
echo "3️⃣ Testing Zarr metadata endpoint..."
METADATA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/datasets/ocean/zarr/.zmetadata")
if [ "$METADATA_STATUS" = "200" ]; then
    print_success "Zarr metadata accessible (HTTP $METADATA_STATUS)"
else
    print_error "Zarr metadata failed (HTTP $METADATA_STATUS)"
    exit 1
fi
echo ""

# Test 4: Check CORS headers
echo "4️⃣ Testing CORS configuration..."
CORS_HEADER=$(curl -s -I "$SERVER_URL/datasets/ocean/zarr/.zmetadata" | grep -i "access-control-allow-origin")
if [ -n "$CORS_HEADER" ]; then
    print_success "CORS headers present: $CORS_HEADER"
else
    print_warning "CORS headers not found (may cause browser issues)"
fi
echo ""

# Test 5: Check if variables exist
echo "5️⃣ Testing data variables..."
HAS_U=$(curl -s "$SERVER_URL/datasets/ocean/zarr/u/.zarray")
if [ -n "$HAS_U" ]; then
    print_success "Variable 'u' found"
else
    print_warning "Variable 'u' not found"
fi

HAS_V=$(curl -s "$SERVER_URL/datasets/ocean/zarr/v/.zarray")
if [ -n "$HAS_V" ]; then
    print_success "Variable 'v' found"
else
    print_warning "Variable 'v' not found"
fi
echo ""

# Test 6: Test chunk download
echo "6️⃣ Testing chunk download..."
CHUNK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/datasets/ocean/zarr/u/0.0.0")
if [ "$CHUNK_STATUS" = "200" ]; then
    print_success "Chunk download successful (HTTP $CHUNK_STATUS)"
    
    # Get chunk size
    CHUNK_SIZE=$(curl -s "$SERVER_URL/datasets/ocean/zarr/u/0.0.0" | wc -c)
    echo "   Chunk size: $CHUNK_SIZE bytes"
else
    print_error "Chunk download failed (HTTP $CHUNK_STATUS)"
fi
echo ""

# Test 7: Check React app
echo "7️⃣ Testing React application..."
if curl -s "$REACT_URL" > /dev/null 2>&1; then
    print_success "React app is running at $REACT_URL"
else
    print_warning "React app is not running at $REACT_URL"
    echo ""
    echo "Start the React app with:"
    echo "  cd /home/kishank/ocean-plugin/plugin/widget5"
    echo "  ./start-app.sh"
    echo ""
fi
echo ""

# Test 8: Performance test
echo "8️⃣ Performance test (loading 10 chunks)..."
START_TIME=$(date +%s%N)
for i in {0..9}; do
    curl -s "$SERVER_URL/datasets/ocean/zarr/u/0.0.$i" > /dev/null 2>&1 || true
done
END_TIME=$(date +%s%N)
ELAPSED=$((($END_TIME - $START_TIME) / 1000000))  # Convert to milliseconds

echo "   Total time: ${ELAPSED}ms"
echo "   Average per chunk: $((ELAPSED / 10))ms"

if [ $ELAPSED -lt 1000 ]; then
    print_success "Performance is good (< 1s for 10 chunks)"
elif [ $ELAPSED -lt 3000 ]; then
    print_warning "Performance is acceptable (1-3s for 10 chunks)"
else
    print_warning "Performance is slow (> 3s for 10 chunks)"
    echo "   Consider:"
    echo "   - Increasing chunk size: --spatial-chunk 512"
    echo "   - Increasing cache: --cache-size 2GB"
fi
echo ""

# Summary
echo "════════════════════════════════════════"
echo "📊 Test Summary"
echo "════════════════════════════════════════"
echo ""

if [ "$METADATA_STATUS" = "200" ] && [ "$CHUNK_STATUS" = "200" ]; then
    print_success "All critical tests passed!"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Open your browser to: $REACT_URL"
    echo "   2. Open DevTools (F12)"
    echo "   3. Check Console for:"
    echo "      - '🌊 ZarrLoader initialized'"
    echo "      - '✅ Metadata loaded'"
    echo "   4. Watch particles animate on the map!"
    echo ""
    echo "📝 Environment:"
    echo "   Server: $SERVER_URL"
    echo "   React App: $REACT_URL"
    echo "   Zarr Endpoint: $SERVER_URL/datasets/ocean/zarr"
    echo ""
else
    print_error "Some tests failed - check errors above"
    exit 1
fi
