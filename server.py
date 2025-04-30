#!/usr/bin/env python3
"""
Server for the Tariff Calculator Chrome extension.
Provides an API endpoint for fetching the latest tariff rates.
"""

import http.server
import socketserver
import os
import json
import time
from datetime import datetime
from typing import Dict, Any
import signal
import sys

# Port for the server
PORT = 5000

# Default tariff data (based on the Trump 2.0 Tariff Tracker)
DEFAULT_TARIFF_DATA = {
    'defaultRate': 25,  # Default rate
    'currencyRates': {
        'USD': 25,  # US imports from China
        'EUR': 20,  # European Union imports
        'GBP': 22,  # UK imports
        'CAD': 18,  # Canadian imports
        'AUD': 19,  # Australian imports
        'JPY': 15   # Japanese imports
    },
    'lastUpdated': datetime.now().isoformat(),
    'source': 'Trade Compliance Resource Hub',
    'url': 'https://www.tradecomplianceresourcehub.com/2025/04/29/trump-2-0-tariff-tracker/'
}


class TariffRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler for the tariff data server."""

    def send_cors_headers(self):
        """Send CORS headers to allow requests from the Chrome extension."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight."""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        """Handle GET requests."""
        # Serve tariff data API endpoint
        if self.path == "/tariff_data":
            # Update the last updated timestamp
            tariff_data = DEFAULT_TARIFF_DATA.copy()
            tariff_data['lastUpdated'] = datetime.now().isoformat()
            
            # Send the response
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(tariff_data).encode())
            return
        
        # Serve static files
        return super().do_GET()


def run_server():
    """Run the HTTP server."""
    try:
        # Create the server with address reuse option
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("0.0.0.0", PORT), TariffRequestHandler) as httpd:
            print(f"Server running at http://0.0.0.0:{PORT}/")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nShutting down server...")
                httpd.shutdown()
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"Error: Port {PORT} is already in use.")
            print("Please stop any existing server processes before starting a new one.")
            sys.exit(1)
        else:
            raise


def handle_signals(signum, frame):
    """Handle termination signals gracefully."""
    print("\nReceived signal to terminate. Shutting down...")
    sys.exit(0)


if __name__ == "__main__":
    # Set up signal handlers
    signal.signal(signal.SIGINT, handle_signals)
    signal.signal(signal.SIGTERM, handle_signals)
    
    # Start the server
    run_server()