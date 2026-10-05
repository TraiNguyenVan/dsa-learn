"""CLI Command: dsa-learn serve."""

from __future__ import annotations

import sys
import webbrowser

from dsa_learn.config import DEFAULT_PORT
from dsa_learn.server.app import create_server
from dsa_learn.server.watcher import stop_watcher


def handle_serve_cmd(args: list[str]) -> int:
    """Handle 'dsa-learn serve [options]' command execution."""
    port = DEFAULT_PORT
    open_browser = True

    idx = 0
    while idx < len(args):
        arg = args[idx]
        if arg == "--port" and idx + 1 < len(args):
            try:
                port = int(args[idx + 1])
                idx += 1
            except ValueError:
                print(f"Error: Invalid port '{args[idx + 1]}'", file=sys.stderr)
                return 1
        elif arg == "--no-browser":
            open_browser = False
        idx += 1

    try:
        server, actual_port = create_server(host="127.0.0.1", port=port)
    except Exception as exc:
        print(f"Error starting server: {exc}", file=sys.stderr)
        return 1

    url = f"http://localhost:{actual_port}"
    print(f"\n========================================================================")
    print(f"🚀 DSA Learn Platform Dashboard Live")
    print(f"------------------------------------------------------------------------")
    print(f"URL:        {url}")
    print(f"Mode:       Offline Local Workstation")
    print(f"Watching:   exercises/ (auto-verification on file save)")
    print(f"========================================================================")
    print(f"Press Ctrl+C to stop.\n")

    if open_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping DSA Learn server...")
    finally:
        stop_watcher()
        server.shutdown()
        server.server_close()
        print("Server stopped cleanly.")

    return 0
