#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QES_JSON = ROOT / "qes" / "public-qes.json"
QES_HTML = ROOT / "qes" / "index.html"
EVIDENCE_HTML = ROOT / "evidence" / "index.html"
HOME_HTML = ROOT / "index.html"

EXPECTED_IDS = [
    *(f"MB{i}" for i in range(1, 8)),
    *(f"S{i}" for i in range(1, 7)),
    *(f"P{i}" for i in range(1, 9)),
    *(f"X{i}" for i in range(1, 12)),
    *(f"M{i}" for i in range(1, 7)),
    *(f"D{i}" for i in range(1, 7)),
    *(f"R{i}" for i in range(1, 10)),
    *(f"V{i}" for i in range(1, 10)),
    *(f"U{i}" for i in range(1, 6)),
]
DIMS = {
    "implementation_score": 25,
    "science_score": 30,
    "test_score": 20,
    "engineering_score": 15,
    "provenance_score": 10,
}
FORBIDDEN = (
    "\\\\NAS01\\",
    "/mnt/runner-artifacts",
    "R:\\xmdworkbench-evidence",
    "tvl-w11-windows-01",
    "tvl-nuc02-linux-01",
    "GITHUB_TOKEN",
)


def fail(msg: str) -> None:
    raise SystemExit(msg)


def main() -> int:
    data = json.loads(QES_JSON.read_text(encoding="utf-8"))
    records = data.get("records")
    if not isinstance(records, dict):
        fail("QES records must be an object")
    if len(EXPECTED_IDS) != 67 or len(set(EXPECTED_IDS)) != 67:
        fail("canonical public capability ID set must contain exactly 67 unique IDs")
    unknown = sorted(set(records) - set(EXPECTED_IDS))
    if unknown:
        fail(f"QES projection contains unknown capability IDs: {unknown}")

    for feature_id, record in records.items():
        if not isinstance(record, dict):
            fail(f"{feature_id}: record must be an object")
        scores = []
        for key, maximum in DIMS.items():
            value = record.get(key)
            if type(value) is not int or not 0 <= value <= maximum:
                fail(f"{feature_id}: invalid {key}")
            scores.append(value)
        total = record.get("quality_score")
        if type(total) is not int or total != sum(scores):
            fail(f"{feature_id}: quality_score must equal five subscore sum")
        if not 0 <= total <= 100:
            fail(f"{feature_id}: quality_score outside 0..100")

    qes = QES_HTML.read_text(encoding="utf-8")
    evidence = EVIDENCE_HTML.read_text(encoding="utf-8")
    home = HOME_HTML.read_text(encoding="utf-8")
    combined = qes + evidence + home + QES_JSON.read_text(encoding="utf-8")
    for token in FORBIDDEN:
        if token in combined:
            fail(f"public dashboard contains forbidden private token: {token}")

    required_qes = ("Quality Evidence Score matrix", "67", "Quanty parity", "Material validation", "public-qes.json")
    for token in required_qes:
        if token not in qes:
            fail(f"QES page missing required publication marker: {token}")

    required_evidence = (
        "408", "378", "13", "16", "18 / 18", "not", "material validation", "QES matrix"
    )
    lower_evidence = evidence.lower()
    for token in required_evidence:
        if token.lower() not in lower_evidence:
            fail(f"Evidence page missing required correction/coverage marker: {token}")

    for href in ('href="qes/"', 'href="evidence/"', 'href="roadmap/periodic.html"'):
        if href not in home:
            fail(f"Home page missing dashboard link: {href}")

    print(f"public dashboards OK: capabilities={len(EXPECTED_IDS)} qes_records={len(records)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
