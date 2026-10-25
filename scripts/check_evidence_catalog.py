from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "evidence"
CATALOG = EVIDENCE / "catalog.json"
HEX = set("0123456789abcdef")
FORBIDDEN = (
    "/mnt/runner-artifacts",
    "\\\\NAS01\\",
    "R:\\",
    "tvl-nuc02",
    "tvl-w11",
    "C:\\Users\\",
)
EXPECTED_IDS = {
    "synthetic-d0",
    "synthetic-d1",
    "synthetic-d8",
    "thermal-d1-300K",
    "thermal-d8-300K",
    "thermal-d8-1200K",
    "charging-only",
    "zero-v-multiplet",
    "covalent-full-shell",
}


def slug(item: dict) -> str:
    return item.get("slug") or item["id"]


def main() -> int:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    if data.get("schema_version") != "xmd-public-evidence-catalog-v1":
        raise SystemExit("unexpected evidence catalog schema")
    items = data.get("items")
    if not isinstance(items, list) or len(items) != 9:
        raise SystemExit("evidence catalog must contain exactly nine retained cases in v1")
    ids = [item.get("id") for item in items if isinstance(item, dict)]
    if len(ids) != 9 or set(ids) != EXPECTED_IDS or len(set(ids)) != 9:
        raise SystemExit("evidence catalog case identities drifted")

    slugs: set[str] = set()
    for item in items:
        item_slug = slug(item)
        if not isinstance(item_slug, str) or not item_slug or item_slug in slugs:
            raise SystemExit(f"invalid or duplicate evidence slug: {item_slug!r}")
        slugs.add(item_slug)
        detail = EVIDENCE / "items" / item_slug / "index.html"
        if not detail.is_file():
            raise SystemExit(f"missing evidence detail page: {item_slug}")
        digest = item.get("comparison_sha256")
        if not isinstance(digest, str) or len(digest) != 64 or any(c not in HEX for c in digest):
            raise SystemExit(f"invalid comparison SHA-256: {item['id']}")
        if item.get("status") != "executed-passed":
            raise SystemExit(f"unexpected evidence status: {item['id']}")

    source = data.get("run", {}).get("source_head_sha")
    tested = data.get("run", {}).get("tested_merge_sha")
    for name, value in (("source_head_sha", source), ("tested_merge_sha", tested)):
        if not isinstance(value, str) or len(value) != 40 or any(c not in HEX for c in value):
            raise SystemExit(f"invalid {name}")
    if source == tested:
        raise SystemExit("source and tested merge SHA must remain distinguishable for this historical PR run")

    combined = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(EVIDENCE.rglob("*"))
        if path.is_file() and path.suffix.lower() in {".json", ".html", ".js", ".css"}
    )
    lower = combined.lower()
    for token in FORBIDDEN:
        if token.lower() in lower:
            raise SystemExit(f"private token leaked into public Evidence catalog: {token}")

    detail_js = (EVIDENCE / "detail.js").read_text(encoding="utf-8")
    if "cluster evidence uses its own reviewed cluster tolerances" not in detail_js:
        raise SystemExit("cluster acceptance contract separation is missing")
    cluster_branch = detail_js.split("if(i.family==='cluster')", 1)[1].split("}else{", 1)[0]
    for atomic_key in ("level_max_error_eV", "spectrum_relative_max_error", "strength_absolute_error"):
        if atomic_key in cluster_branch:
            raise SystemExit(f"cluster renderer improperly reuses atomic tolerance {atomic_key}")

    index = (EVIDENCE / "index.html").read_text(encoding="utf-8")
    if "Scientific evidence catalog" not in index or "Loading evidence catalog" not in index:
        raise SystemExit("Evidence landing page is no longer catalog-first")

    print("Evidence catalog OK: 9 executed cases, 9 detail pages, provenance and privacy checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
