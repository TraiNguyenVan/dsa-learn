"""Zero-dependency RFC 6455 WebSocket framing, masking, and server connection handler."""

from __future__ import annotations

import base64
import hashlib
import io
import os
import socket
import struct
import threading
from typing import BinaryIO, Callable

# RFC 6455 GUID for Sec-WebSocket-Accept computation
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

# Opcodes
OP_CONT = 0x0
OP_TEXT = 0x1
OP_BINARY = 0x2
OP_CLOSE = 0x8
OP_PING = 0x9
OP_PONG = 0xA


def compute_accept_token(client_key: str) -> str:
    """Compute RFC 6455 Sec-WebSocket-Accept token from Sec-WebSocket-Key."""
    raw = (client_key.strip() + WS_GUID).encode("utf-8")
    return base64.b64encode(hashlib.sha1(raw).digest()).decode("utf-8")


def encode_frame(opcode: int, payload: bytes, fin: bool = True) -> bytes:
    """Encode an unmasked frame for server-to-client transmission."""
    b0 = (0x80 if fin else 0) | (opcode & 0x0F)
    length = len(payload)

    if length <= 125:
        header = bytes([b0, length])
    elif length <= 65535:
        header = bytes([b0, 126]) + struct.pack("!H", length)
    else:
        header = bytes([b0, 127]) + struct.pack("!Q", length)

    return header + payload


def decode_frame_header(stream: BinaryIO) -> tuple[bool, int, bool, int, bytes | None]:
    """Read and decode frame header from stream.
    
    Returns (fin, opcode, has_mask, payload_length, mask_key).
    """
    first_two = stream.read(2)
    if len(first_two) < 2:
        raise ConnectionResetError("Connection closed while reading frame header")

    b0, b1 = first_two
    fin = bool(b0 & 0x80)
    opcode = b0 & 0x0F
    has_mask = bool(b1 & 0x80)
    payload_len = b1 & 0x7F

    if payload_len == 126:
        ext = stream.read(2)
        if len(ext) < 2:
            raise ConnectionResetError("Truncated 16-bit extended length")
        payload_len = struct.unpack("!H", ext)[0]
    elif payload_len == 127:
        ext = stream.read(8)
        if len(ext) < 8:
            raise ConnectionResetError("Truncated 64-bit extended length")
        payload_len = struct.unpack("!Q", ext)[0]

    mask_key = None
    if has_mask:
        mask_key = stream.read(4)
        if len(mask_key) < 4:
            raise ConnectionResetError("Truncated masking key")

    return fin, opcode, has_mask, payload_len, mask_key


def unmask_payload(payload: bytes, mask_key: bytes) -> bytes:
    """Apply XOR unmasking to client payload."""
    if not mask_key:
        return payload
    return bytes(b ^ mask_key[i % 4] for i, b in enumerate(payload))


class WebSocketConnection:
    """Thread-safe RFC 6455 WebSocket connection wrapper over standard TCP socket."""

    def __init__(self, sock: socket.socket):
        self.sock = sock
        self._rfile = sock.makefile("rb")
        self._lock = threading.Lock()
        self.is_closed = False

    def send_text(self, text: str) -> None:
        """Send UTF-8 text frame."""
        self.send_frame(OP_TEXT, text.encode("utf-8"))

    def send_binary(self, data: bytes) -> None:
        """Send binary frame."""
        self.send_frame(OP_BINARY, data)

    def send_ping(self, data: bytes = b"") -> None:
        """Send ping frame."""
        self.send_frame(OP_PING, data)

    def send_pong(self, data: bytes = b"") -> None:
        """Send pong frame."""
        self.send_frame(OP_PONG, data)

    def send_frame(self, opcode: int, payload: bytes) -> None:
        """Thread-safe frame transmission."""
        if self.is_closed:
            return
        frame = encode_frame(opcode, payload)
        with self._lock:
            try:
                self.sock.sendall(frame)
            except (BrokenPipeError, ConnectionResetError, OSError):
                self.is_closed = True

    def close(self, code: int = 1000, reason: str = "") -> None:
        """Send close frame and shut down socket."""
        if self.is_closed:
            return
        self.is_closed = True
        try:
            payload = struct.pack("!H", code) + reason.encode("utf-8")
            self.send_frame(OP_CLOSE, payload)
        except Exception:
            pass
        finally:
            try:
                self._rfile.close()
                self.sock.close()
            except Exception:
                pass

    def recv(self) -> tuple[int, bytes | None]:
        """Receive next complete message. Handles ping/pong and fragmentation.
        
        Returns (opcode, payload) or (OP_CLOSE, None) if closed.
        """
        fragments: list[bytes] = []
        initial_opcode = None

        while not self.is_closed:
            try:
                fin, opcode, has_mask, length, mask_key = decode_frame_header(self._rfile)
            except (ConnectionResetError, BrokenPipeError, EOFError, OSError):
                self.is_closed = True
                return OP_CLOSE, None

            # Read exact payload
            body = bytearray()
            while len(body) < length:
                chunk = self._rfile.read(min(length - len(body), 65536))
                if not chunk:
                    self.is_closed = True
                    return OP_CLOSE, None
                body.extend(chunk)

            if has_mask and mask_key:
                body = bytearray(unmask_payload(bytes(body), mask_key))

            # Control frames
            if opcode == OP_CLOSE:
                self.close(1000)
                return OP_CLOSE, None
            elif opcode == OP_PING:
                self.send_pong(bytes(body))
                continue
            elif opcode == OP_PONG:
                continue

            # Data frames
            if initial_opcode is None:
                initial_opcode = opcode
            fragments.append(bytes(body))

            if fin:
                full_payload = b"".join(fragments)
                return initial_opcode, full_payload

        return OP_CLOSE, None
