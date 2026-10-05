"""HTTP API, WebSocket bridge, and static distribution server for DSA Learn."""

from __future__ import annotations

import json
import mimetypes
import queue
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from dsa_learn.config import DEFAULT_PORT, FRONTEND_DIST_DIR
from dsa_learn.server import handlers, websocket
from dsa_learn.server.watcher import register_subscriber, remove_subscriber, start_watcher


class DSAHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Custom HTTP request handler with API routing, SSE streaming, WebSocket upgrades, and static SPA serving."""

    def end_headers(self) -> None:
        # Add CORS headers for local frontend development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        """Handle CORS pre-flight requests."""
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def _send_json(self, status_code: int, data: dict[str, Any]) -> None:
        """Helper to send JSON response."""
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        """Route GET requests and WebSocket upgrades."""
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        query = parse_qs(parsed.query)

        # WebSocket upgrade check
        if self.headers.get("Upgrade", "").lower() == "websocket":
            self._handle_websocket_upgrade(path, query)
            return

        # SSE endpoint
        if path == "/api/events":
            self._handle_sse()
            return

        # API routing
        if path.startswith("/api/"):
            if path == "/api/topics":
                status, data = handlers.get_topics_handler()
                self._send_json(status, data)
                return
            if path == "/api/exercises":
                status, data = handlers.get_exercises_handler()
                self._send_json(status, data)
                return
            if path == "/api/progress":
                status, data = handlers.get_progress_handler()
                self._send_json(status, data)
                return
            if path == "/api/tools":
                status, data = handlers.get_tools_handler()
                self._send_json(status, data)
                return
            if path == "/api/patterns":
                status, data = handlers.get_patterns_handler(query)
                self._send_json(status, data)
                return
            if path.startswith("/api/curriculum/topics/"):
                parts = path.split("/")
                if len(parts) == 6 and parts[5] == "lesson":
                    topic_id = parts[4]
                    status, data = handlers.get_topic_lesson_handler(topic_id)
                    self._send_json(status, data)
                    return
            if path.startswith("/api/exercises/"):
                parts = path.split("/")
                if len(parts) == 4:
                    ex_id = parts[3]
                    status, data = handlers.get_exercise_detail_handler(ex_id)
                    self._send_json(status, data)
                    return
                if len(parts) == 5 and parts[4] == "solution":
                    ex_id = parts[3]
                    status, data = handlers.get_solution_handler(ex_id, query)
                    self._send_json(status, data)
                    return
                if len(parts) == 6 and parts[5] == "hints":
                    topic_id = parts[3]
                    ex_id = parts[4]
                    status, data = handlers.get_exercise_hints_handler(topic_id, ex_id)
                    self._send_json(status, data)
                    return
                if len(parts) == 5 and parts[4] == "hints":
                    # Fallback single exercise hints lookup if topic_id omitted
                    ex_id = parts[3]
                    from dsa_learn.runner.executor import find_exercise
                    try:
                        ex_info = find_exercise(ex_id)
                        t_id = ex_info["topic_id"]
                        status, data = handlers.get_exercise_hints_handler(t_id, ex_id)
                        self._send_json(status, data)
                        return
                    except Exception:
                        pass

            self._send_json(404, {"error": "API route not found"})
            return

        # Static file serving (SPA fallback)
        self._serve_static(parsed.path)

    def do_PUT(self) -> None:
        """Route PUT requests (e.g. saving in-browser code)."""
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path.startswith("/api/exercises/"):
            parts = path.split("/")
            if len(parts) == 5 and parts[4] == "code":
                ex_id = parts[3]
                length = int(self.headers.get("Content-Length", 0))
                body_bytes = self.rfile.read(length) if length > 0 else b"{}"
                status, data = handlers.put_code_handler(ex_id, body_bytes)
                self._send_json(status, data)
                return

        self._send_json(404, {"error": "API route not found"})

    def do_POST(self) -> None:
        """Route POST requests."""
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path.startswith("/api/curriculum/topics/"):
            parts = path.split("/")
            if len(parts) == 7 and parts[5] == "lesson" and parts[6] == "progress":
                topic_id = parts[4]
                length = int(self.headers.get("Content-Length", 0))
                body_bytes = self.rfile.read(length) if length > 0 else b"{}"
                status, data = handlers.post_lesson_progress_handler(topic_id, body_bytes)
                self._send_json(status, data)
                return
            if len(parts) == 7 and parts[5] == "visualizer" and parts[6] == "progress":
                topic_id = parts[4]
                length = int(self.headers.get("Content-Length", 0))
                body_bytes = self.rfile.read(length) if length > 0 else b"{}"
                status, data = handlers.post_visualizer_progress_handler(topic_id, body_bytes)
                self._send_json(status, data)
                return

        if path.startswith("/api/exercises/"):
            parts = path.split("/")
            if len(parts) == 5 and parts[4] == "run":
                ex_id = parts[3]
                status, data = handlers.post_run_handler(ex_id)
                self._send_json(status, data)
                return
            if len(parts) == 5 and parts[4] == "compile-run":
                ex_id = parts[3]
                length = int(self.headers.get("Content-Length", 0))
                body_bytes = self.rfile.read(length) if length > 0 else b"{}"
                status, data = handlers.post_compile_run_handler(ex_id, body_bytes)
                self._send_json(status, data)
                return
            if len(parts) == 5 and parts[4] == "debug-build":
                ex_id = parts[3]
                status, data = handlers.post_debug_build_handler(ex_id)
                self._send_json(status, data)
                return
            if len(parts) == 5 and parts[4] == "reset":
                ex_id = parts[3]
                status, data = handlers.post_reset_handler(ex_id)
                self._send_json(status, data)
                return
            if len(parts) == 7 and parts[5] == "hints" and parts[6] == "unlock":
                topic_id = parts[3]
                ex_id = parts[4]
                status, data = handlers.post_unlock_hint_handler(topic_id, ex_id)
                self._send_json(status, data)
                return
            if len(parts) == 6 and parts[4] == "hints" and parts[5] == "unlock":
                ex_id = parts[3]
                from dsa_learn.runner.executor import find_exercise
                try:
                    ex_info = find_exercise(ex_id)
                    t_id = ex_info["topic_id"]
                    status, data = handlers.post_unlock_hint_handler(t_id, ex_id)
                    self._send_json(status, data)
                    return
                except Exception:
                    pass

        self._send_json(404, {"error": "API route not found"})

    def _handle_websocket_upgrade(self, path: str, query: dict[str, list[str]]) -> None:
        """Perform RFC 6455 handshake and transfer socket to WebSocket bridge."""
        ws_key = self.headers.get("Sec-WebSocket-Key")
        if not ws_key:
            self.send_error(HTTPStatus.BAD_REQUEST, "Missing Sec-WebSocket-Key")
            return

        accept_token = websocket.compute_accept_token(ws_key)
        handshake_resp = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept_token}\r\n\r\n"
        ).encode("utf-8")
        self.wfile.write(handshake_resp)
        self.wfile.flush()

        ws = websocket.WebSocketConnection(self.connection)

        if path == "/ws/lsp":
            from dsa_learn.server.lsp_bridge import handle_lsp_websocket
            handle_lsp_websocket(ws, query)
        elif path == "/ws/terminal":
            from dsa_learn.server.terminal_bridge import handle_terminal_websocket
            handle_terminal_websocket(ws, query)
        elif path == "/ws/debug":
            from dsa_learn.server.debug.bridge import handle_debug_websocket
            handle_debug_websocket(ws, query)
        else:
            ws.close(1002, "Unsupported WebSocket endpoint")

    def _handle_sse(self) -> None:
        """Stream Server-Sent Events to the connected client."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        q = register_subscriber()
        try:
            self.wfile.write(b"event: connected\ndata: {\"status\": \"ok\"}\n\n")
            self.wfile.flush()

            while True:
                try:
                    payload = q.get(timeout=15.0)
                    self.wfile.write(payload.encode("utf-8"))
                    self.wfile.flush()
                except queue.Empty:
                    # Heartbeat comment to keep connection alive
                    self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            remove_subscriber(q)

    def _serve_static(self, rel_path: str) -> None:
        """Serve static files from frontend/dist/ with SPA fallback."""
        if not FRONTEND_DIST_DIR.exists():
            body = (
                "<!DOCTYPE html><html><head><title>DSA Learn</title></head>"
                "<body style='font-family:sans-serif;background:#0F172A;color:#F8FAFC;padding:2rem;text-align:center;'>"
                "<h1>DSA Learn Platform API Live</h1>"
                "<p>API routes are operational at <code>/api/topics</code>, <code>/api/exercises</code>, <code>/api/progress</code>, <code>/api/tools</code>.</p>"
                "<p>To view the React dashboard, build the frontend with <code>cd frontend && npm run build</code>.</p>"
                "</body></html>"
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        clean_path = rel_path.lstrip("/")
        target_file = (FRONTEND_DIST_DIR / clean_path).resolve()

        if target_file.is_file() and str(target_file).startswith(str(FRONTEND_DIST_DIR.resolve())):
            file_to_send = target_file
        else:
            file_to_send = FRONTEND_DIST_DIR / "index.html"

        if not file_to_send.exists():
            self.send_error(404, "File not found")
            return

        content = file_to_send.read_bytes()
        mime_type, _ = mimetypes.guess_type(str(file_to_send))
        self.send_response(200)
        self.send_header("Content-Type", mime_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format: str, *args: Any) -> None:
        """Silence default access logs during automated test runs or standard usage."""
        pass


def create_server(host: str = "127.0.0.1", port: int = DEFAULT_PORT) -> tuple[ThreadingHTTPServer, int]:
    """Create HTTP server with automatic port-hunting if initial port is occupied."""
    start_watcher()
    current_port = port
    max_port = port + 20

    while current_port <= max_port:
        try:
            server = ThreadingHTTPServer((host, current_port), DSAHTTPRequestHandler)
            return server, current_port
        except OSError:
            current_port += 1

    raise OSError(f"Could not bind to any port between {port} and {max_port}.")
