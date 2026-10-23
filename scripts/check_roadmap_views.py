#!/usr/bin/env python3
"""Fail closed when public Roadmap/Periodic Table drift or history bytes change."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROADMAP = ROOT / "roadmap"
HISTORY = ROADMAP / "history.json"
ROADMAP_HTML = ROADMAP / "index.html"
PERIODIC_JS = ROADMAP / "periodic.js"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


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

    ids: set[str] = set()
    files: set[str] = set()
    for frame in frames:
        frame_id = frame.get("id")
        name = frame.get("file")
        expected_blob = frame.get("blob_sha")
        if not isinstance(frame_id, str) or not frame_id or frame_id in ids:
            raise SystemExit(f"invalid or duplicate roadmap frame id: {frame_id!r}")
        ids.add(frame_id)
        if not name or Path(name).name != name or not name.endswith(".mmd") or name in files:
            raise SystemExit(f"unsafe or duplicate roadmap frame name: {name!r}")
        files.add(name)
        path = ROADMAP / name
        if not path.is_file():
            raise SystemExit(f"missing roadmap frame: {name}")
        if not isinstance(expected_blob, str) or not SHA_RE.fullmatch(expected_blob):
            raise SystemExit(f"frame {frame_id} has invalid blob_sha")
        actual_blob = git_blob_sha(path.read_bytes())
        if actual_blob != expected_blob:
            raise SystemExit(
                f"immutable roadmap frame changed: {name} "
                f"(expected {expected_blob}, got {actual_blob})"
            )

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

    print(
        f"Roadmap and Periodic Table share immutable history.json; "
        f"latest frame has {len(nodes)} capabilities"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
