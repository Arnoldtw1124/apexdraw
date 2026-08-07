import http.server
import socketserver
import mimetypes
import json

# Explicitly add WEBP and AVIF MIME types for Python server on Windows
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/avif', '.avif')

PORT = 8000

# Shared In-Memory Sync State between OBS Dock and OBS Overlay Source
latest_state = {
    "seq": 0,
    "event": None,
    "twitchChannel": "",
    "twitchReward": "抽隨機英雄和槍枝",
    # Persistent queue state - always reflects the latest queue, independent of event replay
    "queue": {
        "activeViewer": None,
        "waitingQueue": []
    }
}

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, *')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/poll'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(latest_state).encode('utf-8'))
            return
        super().do_GET()

    def do_POST(self):
        global latest_state
        if self.path.startswith('/api/spin') or self.path.startswith('/api/sync'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode('utf-8'))
                latest_state["seq"] += 1
                latest_state["event"] = data
                if "twitchChannel" in data and data["twitchChannel"]:
                    latest_state["twitchChannel"] = data["twitchChannel"]
                if "twitchReward" in data and data["twitchReward"]:
                    latest_state["twitchReward"] = data["twitchReward"]

                # --- Persist queue state so overlay always gets fresh data ---
                if data.get("type") == "QUEUE_UPDATE":
                    latest_state["queue"]["activeViewer"] = data.get("activeViewer", None)
                    latest_state["queue"]["waitingQueue"] = data.get("waitingQueue", [])
                elif data.get("type") in ("QUEUE_CLEAR", "SPIN_START"):
                    # Clear queue on explicit reset
                    if data.get("type") == "QUEUE_CLEAR":
                        latest_state["queue"]["activeViewer"] = None
                        latest_state["queue"]["waitingQueue"] = []

            except Exception as e:
                print("Error parsing sync payload:", e)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "seq": latest_state["seq"]}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        # Suppress noisy GET /api/poll logs
        if '/api/poll' not in args[0]:
            super().log_message(format, *args)

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Serving HTTP & OBS Real-Time Sync Server on port {PORT}...")
        httpd.serve_forever()
