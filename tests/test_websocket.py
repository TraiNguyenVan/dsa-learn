"""Unit tests for RFC 6455 WebSocket framing, masking, and handshake."""

import io
import unittest

from dsa_learn.server.websocket import (
    compute_accept_token,
    encode_frame,
    decode_frame_header,
    unmask_payload,
    OP_TEXT,
    OP_BINARY,
)


class TestWebSocketFraming(unittest.TestCase):
    def test_compute_accept_token(self):
        # RFC 6455 Section 1.3 Example
        client_key = "dGhlIHNhbXBsZSBub25jZQ=="
        expected_accept = "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="
        self.assertEqual(compute_accept_token(client_key), expected_accept)

    def test_encode_short_text_frame(self):
        data = "Hello"
        frame = encode_frame(OP_TEXT, data.encode("utf-8"))
        # Byte 0: FIN (0x80) | OP_TEXT (0x01) -> 0x81
        # Byte 1: Mask (0) | Length (5) -> 0x05
        self.assertEqual(frame[:2], b"\x81\x05")
        self.assertEqual(frame[2:], b"Hello")

    def test_encode_medium_payload(self):
        # Payload between 126 and 65535 bytes
        payload = b"x" * 200
        frame = encode_frame(OP_BINARY, payload)
        self.assertEqual(frame[0], 0x82)
        self.assertEqual(frame[1], 126)
        self.assertEqual(frame[2:4], (200).to_bytes(2, "big"))
        self.assertEqual(frame[4:], payload)

    def test_mask_and_unmask(self):
        mask = b"\x12\x34\x56\x78"
        raw_payload = b"Testing 1234"
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(raw_payload))
        unmasked = unmask_payload(masked, mask)
        self.assertEqual(unmasked, raw_payload)

    def test_decode_masked_frame(self):
        mask = b"\xaa\xbb\xcc\xdd"
        payload = b"WebSocket Message"
        masked_payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))

        header = bytes([0x81, 0x80 | len(payload)]) + mask
        stream = io.BytesIO(header + masked_payload)

        fin, opcode, has_mask, length, read_mask = decode_frame_header(stream)
        self.assertTrue(fin)
        self.assertEqual(opcode, OP_TEXT)
        self.assertTrue(has_mask)
        self.assertEqual(length, len(payload))
        self.assertEqual(read_mask, mask)

        body = stream.read(length)
        self.assertEqual(unmask_payload(body, read_mask), payload)


if __name__ == "__main__":
    unittest.main()
