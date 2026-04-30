#!/bin/bash
# Start the Zarr static file server
# This serves SWAN_UGRID.zarr as raw files (same as /home/kishank/deckgl experiment)

cd "$(dirname "$0")"

echo "🌊 Starting Zarr Static File Server..."
echo ""
python3 serve-zarr.py
