#!/usr/bin/env python3
"""
Simple HTTP server with CORS for serving Zarr stores as static files.
This mimics how /home/kishank/deckgl experiment serves niue_forecast.zarr
"""
import http.server
import socketserver
from pathlib import Path

PORT = 8080

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler with CORS headers enabled"""
    
    def end_headers(self):
        # Enable CORS for all origins
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Max-Age', '86400')  # 24 hours preflight cache
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Override to add emoji logging"""
        print(f"📥 {self.address_string()} - {format % args}")

if __name__ == '__main__':
    # Bind to 0.0.0.0 explicitly to accept connections from all interfaces
    with socketserver.TCPServer(("0.0.0.0", PORT), CORSRequestHandler) as httpd:
        print(f"🌊 Serving Zarr files with CORS on port {PORT}")
        print(f"📂 Serving directory: {Path.cwd()}")
        print(f"📡 Access SWAN_UGRID.zarr at:")
        print(f"   http://localhost:{PORT}/SWAN_UGRID.zarr")
        print(f"   http://127.0.0.1:{PORT}/SWAN_UGRID.zarr")
        print(f"   http://172.20.187.192:{PORT}/SWAN_UGRID.zarr")
        print(f"\n⏸️  Press Ctrl+C to stop\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped")
