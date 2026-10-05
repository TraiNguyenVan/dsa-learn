"""Integration tests for concept lesson and pedagogy HTTP API endpoints."""

import json
import threading
import time
import unittest
import urllib.error
import urllib.request

from dsa_learn.server.app import create_server


class TestLessonAPI(unittest.TestCase):
    server = None
    server_thread = None
    base_url = ""

    @classmethod
    def setUpClass(cls):
        cls.server, port = create_server("127.0.0.1", port=8993)
        cls.base_url = f"http://127.0.0.1:{port}"
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        if cls.server:
            cls.server.shutdown()
            cls.server.server_close()

    def _get_json(self, path: str) -> tuple[int, dict]:
        req = urllib.request.Request(f"{self.base_url}{path}")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data

    def _post_json(self, path: str, payload: dict) -> tuple[int, dict]:
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data

    def test_get_topic_lesson(self):
        status, data = self._get_json("/api/curriculum/topics/arrays-hashing/lesson")
        self.assertEqual(status, 200)
        self.assertEqual(data["topic_id"], "arrays-hashing")
        self.assertIn("sections", data)
        self.assertIn("complexity_matrix", data)
        self.assertIn("reading_progress", data)
        self.assertGreater(len(data["sections"]), 0)

    def test_update_lesson_progress(self):
        # Update progress on first section
        payload = {"section_id": "overview", "mark_completed": True}
        status, data = self._post_json(
            "/api/curriculum/topics/arrays-hashing/lesson/progress", payload
        )
        self.assertEqual(status, 200)
        self.assertEqual(data["topic_id"], "arrays-hashing")
        self.assertIn("overview", data["completed_sections"])
        self.assertGreater(data["progress_pct"], 0)

        # Verify updated progress is reflected in GET
        status, get_data = self._get_json("/api/curriculum/topics/arrays-hashing/lesson")
        self.assertEqual(status, 200)
        self.assertIn("overview", get_data["reading_progress"]["completed_sections"])


if __name__ == "__main__":
    unittest.main()
