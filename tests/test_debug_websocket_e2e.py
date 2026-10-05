"""End-to-end test against a real WebSocket connection.

The unit tests use a fake socket. A fake that diverges from the real interface is
how `recv()` returning `(opcode, payload)` got mishandled in the first place:
every unit test passed while the real server rejected every command with
"that message was not a valid json". This module speaks the real handshake and
the real frame encoding, so that class of bug cannot pass again.

Skipped when GDB is absent, since a full session needs an engine.
"""

import base64
import json
import os
import shutil
import socket
import struct
import threading
import time
import unittest
from urllib.parse import urlparse

from dsa_learn.server.app import create_server

GDB_PRESENT = shutil.which("gdb") is not None


class RealWebSocketClient:
    """Minimal RFC 6455 client: handshake, masked send, unmasked receive."""

    def __init__(self, host: str, port: int, path: str) -> None:
        self._sock = socket.create_connection((host, port), timeout=20)
        self._sock.settimeout(20)
        self._buffer = b""
        key = base64.b64encode(os.urandom(16)).decode("ascii")
        request = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n"
            "\r\n"
        )
        self._sock.sendall(request.encode("ascii"))
        self._handshake = self._read_until(b"\r\n\r\n")
        if b"101" not in self._handshake.split(b"\r\n")[0]:
            raise AssertionError(f"handshake failed: {self._handshake[:120]!r}")

    def _read_until(self, marker: bytes) -> bytes:
        while marker not in self._buffer:
            chunk = self._sock.recv(65536)
            if not chunk:
                raise AssertionError("connection closed during handshake")
            self._buffer += chunk
        head, _, self._buffer = self._buffer.partition(marker)
        return head + marker

    def _recv_exact(self, count: int) -> bytes:
        while len(self._buffer) < count:
            chunk = self._sock.recv(65536)
            if not chunk:
                raise AssertionError("connection closed")
            self._buffer += chunk
        data, self._buffer = self._buffer[:count], self._buffer[count:]
        return data

    def send_json(self, payload: dict) -> None:
        """Send one text frame, masked as the client side must."""
        body = json.dumps(payload).encode("utf-8")
        header = bytearray([0x81])  # FIN + text opcode
        length = len(body)
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header += struct.pack(">H", length)
        else:
            header.append(0x80 | 127)
            header += struct.pack(">Q", length)
        mask = os.urandom(4)
        header += mask
        masked = bytes(byte ^ mask[i % 4] for i, byte in enumerate(body))
        self._sock.sendall(bytes(header) + masked)

    def recv_json(self) -> dict | None:
        """Receive one text frame, or None on close."""
        first = self._recv_exact(2)
        opcode = first[0] & 0x0F
        length = first[1] & 0x7F
        if length == 126:
            length = struct.unpack(">H", self._recv_exact(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", self._recv_exact(8))[0]
        payload = self._recv_exact(length) if length else b""
        if opcode == 0x8:
            return None
        return json.loads(payload.decode("utf-8"))

    def drain(self, timeout: float = 3.0) -> list[dict]:
        """Collect messages until the socket goes quiet or closes."""
        messages: list[dict] = []
        original = self._sock.gettimeout()
        self._sock.settimeout(timeout)
        try:
            while True:
                message = self.recv_json()
                if message is None:
                    break
                messages.append(message)
        except (socket.timeout, TimeoutError, OSError):
            pass
        except AssertionError:
            # The peer closed mid-frame, which is a legitimate end of stream.
            pass
        finally:
            self._sock.settimeout(original)
        return messages

    def close(self) -> None:
        try:
            self._sock.close()
        except OSError:
            pass


class TestDebugWebSocketOverTheWire(unittest.TestCase):
    """Proves the real transport path, not just the object graph."""

    server = None
    thread = None
    port = 0

    @classmethod
    def setUpClass(cls):
        # create_server returns the requested port, not the bound one, so an
        # ephemeral port has to be asked for explicitly and the real port read
        # back off the socket.
        cls.server, _ = create_server("127.0.0.1", port=0)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.15)

    @classmethod
    def tearDownClass(cls):
        if cls.server:
            cls.server.shutdown()
            cls.server.server_close()

    def _connect(self, exercise_id: str | None = "two-sum") -> RealWebSocketClient:
        path = "/ws/debug" + (f"?exercise_id={exercise_id}" if exercise_id else "")
        return RealWebSocketClient("127.0.0.1", self.port, path)

    def test_command_reaches_the_bridge_and_gets_exactly_one_correlated_reply(self):
        """The transport contract: one response per command, carrying its id.

        `refresh` against a fresh connection is not a valid action - there is no
        session yet - so the expected reply is an `invalid_state` error rather
        than a result. What matters here is that the frame was decoded at all and
        answered exactly once, which is what the tuple-unpacking fix restored.
        """
        client = self._connect()
        try:
            client.send_json({"type": "refresh", "id": 1})
            messages = client.drain(timeout=6)
        finally:
            client.close()

        replies = [m for m in messages if m.get("type") in ("result", "error")]
        self.assertEqual(len(replies), 1, f"expected one reply, got {messages}")
        self.assertEqual(replies[0]["id"], 1)
        self.assertEqual(replies[0]["type"], "error")
        self.assertEqual(replies[0]["code"], "invalid_state")
        # The old failure mode was a JSON decode failure on a well-formed frame.
        self.assertNotIn("valid json", replies[0]["message"].lower())

    def test_stop_on_a_fresh_connection_is_a_safe_no_op(self):
        """Stopping when nothing is running must answer, not hang or crash."""
        client = self._connect()
        try:
            client.send_json({"type": "stop", "id": 9})
            messages = client.drain(timeout=6)
        finally:
            client.close()
        replies = [m for m in messages if m.get("type") in ("result", "error")]
        self.assertEqual(len(replies), 1, f"expected one reply, got {messages}")
        self.assertEqual(replies[0]["id"], 9)

    def test_malformed_json_is_reported_without_a_traceback(self):
        client = self._connect()
        try:
            # Deliberately not valid JSON, to exercise the decode guard.
            client._sock.sendall(b"\x81\x84" + os.urandom(4) + b"\x00\x00\x00\x00")
            messages = client.drain(timeout=4)
        finally:
            client.close()

        errors = [m for m in messages if m.get("type") == "error"]
        self.assertTrue(errors)
        self.assertNotIn("Traceback", errors[0]["message"])

    def test_unknown_command_is_reported_with_its_id(self):
        client = self._connect()
        try:
            client.send_json({"type": "teleport", "id": 77})
            messages = client.drain(timeout=4)
        finally:
            client.close()

        errors = [m for m in messages if m.get("type") == "error"]
        self.assertTrue(errors)
        self.assertEqual(errors[0]["code"], "unknown_command")
        self.assertEqual(errors[0]["id"], 77)

    def test_missing_exercise_id_closes_with_a_reason(self):
        client = self._connect(exercise_id=None)
        try:
            messages = client.drain(timeout=4)
        finally:
            client.close()
        self.assertTrue(any(m.get("code") == "unknown_exercise" for m in messages))

    @unittest.skipUnless(GDB_PRESENT, "GDB is not installed on this host")
    def test_full_session_over_a_real_socket(self):
        """The whole loop: start, stop, and a clean idle state."""
        client = self._connect("two-sum")
        try:
            client.send_json({"type": "start", "id": 1, "breakpoints": []})
            started = client.drain(timeout=90)
            states = [m["state"] for m in started if m.get("type") == "state"]
            self.assertEqual(states[:2], ["COMPILING", "LAUNCHING"])
            self.assertTrue(
                any(m.get("type") == "result" and m.get("id") == 1 for m in started),
                f"no result for start; states seen: {states}",
            )

            client.send_json({"type": "stop", "id": 2})
            stopped = client.drain(timeout=30)
            self.assertTrue(
                any(m.get("type") == "result" and m.get("id") == 2 for m in stopped),
                f"no result for stop; got {[m.get('type') for m in stopped]}",
            )
            self.assertIn("TERMINATED", [m["state"] for m in stopped if m.get("type") == "state"])
        finally:
            client.close()


if __name__ == "__main__":
    unittest.main()