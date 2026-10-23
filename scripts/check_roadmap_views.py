#!/usr/bin/env python3
"""Fail closed when the public Roadmap and Periodic Table stop sharing one status source."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROADMAP = ROOT / "roadmap"
HISTORY = ROADMAP / "history.json"
ROADMAP_HTML = ROADMAP / "index.html"
PERIODIC_JS = ROADMAP / "periodic.js"


def capability_nodes(text: str) -> dict[str, str]:
    nodes: dict[str, str] = {}
    for line in text.splitlines():
        match = re.match(r'^\s*([A-Z]+\d+)\["(.+?)"\]\s*$', line)
        if match:
            nodes[match.group(1)] = match.group(2)
    return nodes


def main() -> int:
    data = json.loads(HISTORY.read_text(encoding="utf-8"))
    frames = data.get("frames")
    if not isinstance(frames, list) or not frames:
        raise SystemExit("roadmap/history.json contains no frames")

    for frame in frames:
        name = frame.get("file")
        if not name or Path(name).name != name or not name.endswith(".mmd"):
            raise SystemExit(f"unsafe roadmap frame name: {name!r}")
        if not (ROADMAP / name).is_file():
            raise SystemExit(f"missing roadmap frame: {name}")

    latest = ROADMAP / frames[-1]["file"]
    nodes = capability_nodes(latest.read_text(encoding="utf-8"))
    if len(nodes) < 20:
        raise SystemExit(f"latest frame exposes only {len(nodes)} capability nodes; detailed view expected")

    roadmap_html = ROADMAP_HTML.read_text(encoding="utf-8")
    periodic_js = PERIODIC_JS.read_text(encoding="utf-8")

    if "history.json" not in roadmap_html:
        raise SystemExit("roadmap view no longer loads roadmap/history.json")
    if "history.json" not in periodic_js:
        raise SystemExit("Periodic Table no longer loads roadmap/history.json")
    if "parseMmd" not in roadmap_html or "parseMmd" not in periodic_js:
        raise SystemExit("both views must derive statuses from the shared Mermaid frame")

    print(f"Roadmap and Periodic Table share history.json; latest frame has {len(nodes)} capabilities")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
