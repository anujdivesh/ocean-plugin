#!/bin/bash
# Start xpublish server for SWAN UGRID data

echo "🚀 Starting xpublish server with SWAN UGRID data..."
echo ""

cd /home/kishank/ocean-plugin/plugin/widget5

# Start server using venv Python
./venv/bin/python3 xpublish-server/server.py --file SWAN_UGRID.zarr --port 9000

