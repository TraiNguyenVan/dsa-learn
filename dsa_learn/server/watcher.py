"""File system watcher and SSE event broadcaster."""

from __future__ import annotations

import json
import queue
import threading
import time
from pathlib import Path
from typing import Any

from dsa_learn.config import EXERCISES_DIR, WORKSPACE_ROOT
from dsa_learn.runner.executor import load_catalog

# Global set of subscriber queues
_SUBSCRIBERS: list[queue.Queue] = []
_SUBSCRIBERS_LOCK = threading.Lock()
_WATCHER_THREAD: threading.Thread | None = None
_RUNNING = False


def register_subscriber() -> queue.Queue:
    """Register a new SSE subscriber queue."""
    q: queue.Queue = queue.Queue(maxsize=50)
    with _SUBSCRIBERS_LOCK:
        _SUBSCRIBERS.append(q)
    return q


def remove_subscriber(q: queue.Queue) -> None:
    """Unregister an SSE subscriber queue."""
    with _SUBSCRIBERS_LOCK:
        if q in _SUBSCRIBERS:
            _SUBSCRIBERS.remove(q)


def broadcast_event(event_type: str, data: dict[str, Any]) -> None:
    """Broadcast an SSE event payload to all active subscribers."""
    payload = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    with _SUBSCRIBERS_LOCK:
        for q in list(_SUBSCRIBERS):
            try:
                q.put_nowait(payload)
            except queue.Full:
                pass


def _watcher_loop() -> None:
    """Poll mtime of exercises files and broadcast change events."""
    global _RUNNING
    last_mtimes: dict[str, float] = {}

    while _RUNNING:
        try:
            catalog = load_catalog()
            for topic in catalog.get("topics", []):
                for ex in topic.get("exercises", []):
                    rel = ex.get("starter_relpath")
                    if not rel:
                        continue
                    full_path = WORKSPACE_ROOT / rel
                    if full_path.exists():
                        try:
                            mtime = full_path.stat().st_mtime
                            if rel in last_mtimes and mtime > last_mtimes[rel]:
                                # File was modified!
                                broadcast_event("file_changed", {
                                    "exercise_id": ex["id"],
                                    "file": rel,
                                })
                            last_mtimes[rel] = mtime
                        except OSError:
                            pass
        except Exception:
            pass

        time.sleep(0.5)


def start_watcher() -> None:
    """Start the background file watcher thread if not already running."""
    global _WATCHER_THREAD, _RUNNING
    if _WATCHER_THREAD and _WATCHER_THREAD.is_alive():
        return
    _RUNNING = True
    _WATCHER_THREAD = threading.Thread(target=_watcher_loop, daemon=True, name="DSAFileWatcher")
    _WATCHER_THREAD.start()


def stop_watcher() -> None:
    """Stop the background file watcher thread."""
    global _RUNNING
    _RUNNING = False
