"""Unit and integration tests for local HTTP API server."""

import json
import threading
import time
import unittest
import urllib.request
import urllib.error
from dsa_learn.server.app import create_server


class TestServer(unittest.TestCase):
    server = None
    server_thread = None
    base_url = ""

    @classmethod
    def setUpClass(cls):
        cls.server, port = create_server("127.0.0.1", port=8990)
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

    def _post_json(self, path: str) -> tuple[int, dict]:
        req = urllib.request.Request(f"{self.base_url}{path}", data=b"{}", method="POST")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data

    def test_get_topics(self):
        status, data = self._get_json("/api/topics")
        self.assertEqual(status, 200)
        self.assertIn("topics", data)
        self.assertGreaterEqual(len(data["topics"]), 4)

    def test_get_exercises(self):
        status, data = self._get_json("/api/exercises")
        self.assertEqual(status, 200)
        self.assertIn("exercises", data)
        ids = [e["id"] for e in data["exercises"]]
        self.assertIn("two-sum", ids)
        self.assertIn("climbing-stairs", ids)

    def test_get_exercise_detail(self):
        status, data = self._get_json("/api/exercises/two-sum")
        self.assertEqual(status, 200)
        self.assertEqual(data["id"], "two-sum")
        self.assertIn("Two Sum", data["title"])
        self.assertIn("problem_markdown", data)
        self.assertIn("solution_code", data)

    def test_get_progress(self):
        status, data = self._get_json("/api/progress")
        self.assertEqual(status, 200)
        self.assertIn("total_exercises", data)
        self.assertIn("completed_exercises", data)
        self.assertIn("topics", data)

    def test_post_run_exercise(self):
        status, data = self._post_json("/api/exercises/two-sum/run")
        self.assertEqual(status, 200)
        self.assertIn("status", data)
        self.assertIn("summary", data)


if __name__ == "__main__":
    unittest.main()
