import http.server
import socketserver
import mimetypes

# Explicitly add WEBP and AVIF MIME types for Python server on Windows
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/avif', '.avif')

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

class CustomHandler(Handler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Serving HTTP on port {PORT} with WebP & AVIF MIME support...")
        httpd.serve_forever()
