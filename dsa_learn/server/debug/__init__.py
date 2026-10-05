"""Debug layer built on vendored pygdbmi (GDB/MI).

FR-027: this package is the single project-owned boundary between the
adopted library and DSA Learn's surfaces. `session.py` is the only module
that imports `pygdbmi`; `bridge.py` is the only module that touches the
WebSocket. Swapping or upgrading the library means editing `session.py`.
"""
