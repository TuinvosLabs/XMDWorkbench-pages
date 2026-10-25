from __future__ import annotations

import json
import math
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
EXPECTED_SLUGS = {
    "synthetic-d0": "synthetic-d0",
    "synthetic-d1": "synthetic-d1",
    "synthetic-d8": "synthetic-d8",
    "thermal-d1-300K": "thermal-d1-300k",
    "thermal-d8-300K": "thermal-d8-300k",
    "thermal-d8-1200K": "thermal-d8-1200k",
    "charging-only": "charging-only",
    "zero-v-multiplet": "zero-v-multiplet",
    "covalent-full-shell": "covalent-full-shell",
}
ATOMIC_SPECTRUM = {
    "xas-x", "xas-y", "xas-z", "xas-isotropic", "xas-r", "xas-l",
    "xld-x-minus-z", "xmcd-r-minus-l",
}
POLARIZATION = {"x", "y", "z", "r", "l"}
THERMAL_KEYS = {
    "partition_function_shifted", "population_sum", "mean_energy_eV",
    "entropy_over_kB", "spin_z_hbar", "orbital_z_hbar", "population_max_absolute",
}
ZERO_V_KEYS = {"initial", "final", "dipole_x", "dipole_y", "dipole_z", "dipole_r", "dipole_l"}


def finite_nonnegative(value: object, label: str, *, positive: bool = False) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(float(value)):
        raise SystemExit(f"{label} must be a finite number")
    number = float(value)
    if number < 0 or (positive and number <= 0):
        raise SystemExit(f"{label} must be {'positive' if positive else 'nonnegative'}")
    return number


def exact_map(value: object, keys: set[str], label: str, *, maximum: float | None = None) -> dict:
    if not isinstance(value, dict) or set(value) != keys:
        raise SystemExit(f"{label} must contain exactly {sorted(keys)}")
    for key, raw in value.items():
        number = finite_nonnegative(raw, f"{label}.{key}")
        if maximum is not None and number > maximum:
            raise SystemExit(f"{label}.{key} exceeds recorded tolerance")
    return value


def slug(item: dict) -> str:
    ident = item.get("id")
    return item.get("slug") or ident


def validate_atomic(item: dict, tolerances: dict) -> None:
    ident = item["id"]
    for key in ("initial_dimension", "final_dimension"):
        value = item.get(key)
        if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
            raise SystemExit(f"{ident}.{key} must be a positive integer")
    level_tol = finite_nonnegative(tolerances.get("level_max_error_eV"), "level tolerance", positive=True)
    spectrum_tol = finite_nonnegative(tolerances.get("spectrum_relative_max_error"), "spectrum tolerance", positive=True)
    strength_tol = finite_nonnegative(tolerances.get("strength_absolute_error"), "strength tolerance", positive=True)
    for key in ("initial_level_max_error_eV", "final_level_max_error_eV"):
        if finite_nonnegative(item.get(key), f"{ident}.{key}") > level_tol:
            raise SystemExit(f"{ident}.{key} exceeds recorded tolerance")
    exact_map(item.get("spectrum_relative_max_errors"), ATOMIC_SPECTRUM, f"{ident}.spectrum_relative_max_errors", maximum=spectrum_tol)
    exact_map(item.get("strength_absolute_errors"), POLARIZATION, f"{ident}.strength_absolute_errors", maximum=strength_tol)
    finite_nonnegative(item.get("elapsed_seconds"), f"{ident}.elapsed_seconds", positive=True)
    if item.get("family") == "thermal":
        expected_temp = {"thermal-d1-300K": 300.0, "thermal-d8-300K": 300.0, "thermal-d8-1200K": 1200.0}[ident]
        if finite_nonnegative(item.get("temperature_K"), f"{ident}.temperature_K", positive=True) != expected_temp:
            raise SystemExit(f"{ident} has unexpected temperature")
        exact_map(item.get("thermal_observable_absolute_errors"), THERMAL_KEYS, f"{ident}.thermal_observable_absolute_errors")
    elif "thermal_observable_absolute_errors" in item:
        raise SystemExit(f"{ident} unexpectedly carries thermal observable errors")


def validate_cluster(item: dict) -> None:
    ident = item["id"]
    if item.get("initial_dimension") != 190 or item.get("final_dimension") != 120:
        raise SystemExit(f"{ident} cluster dimensions drifted")
    exact_map(item.get("level_maximum_errors_eV"), {"initial", "final"}, f"{ident}.level_maximum_errors_eV")
    exact_map(item.get("polarization_relative_maximum_errors"), POLARIZATION, f"{ident}.polarization_relative_maximum_errors")
    exact_map(item.get("integrated_strength_absolute_errors"), POLARIZATION, f"{ident}.integrated_strength_absolute_errors")
    finite_nonnegative(item.get("elapsed_seconds"), f"{ident}.elapsed_seconds", positive=True)
    if "zero_v_atomic_block_maximum_errors" in item:
        exact_map(item["zero_v_atomic_block_maximum_errors"], ZERO_V_KEYS, f"{ident}.zero_v_atomic_block_maximum_errors")
    rows = item.get("cutoff_sweep")
    if rows is not None:
        if not isinstance(rows, list) or not rows:
            raise SystemExit(f"{ident}.cutoff_sweep must be a nonempty list")
        seen = set()
        for row in rows:
            if not isinstance(row, dict) or set(row) < {"cutoff", "spectrum_peak_relative_max", "ground_energy_above_complete_eV"}:
                raise SystemExit(f"{ident}.cutoff_sweep has invalid row")
            cutoff = row.get("cutoff")
            if isinstance(cutoff, bool) or not isinstance(cutoff, int) or cutoff not in {0, 1, 2} or cutoff in seen:
                raise SystemExit(f"{ident}.cutoff_sweep has invalid/duplicate cutoff")
            seen.add(cutoff)
            finite_nonnegative(row.get("spectrum_peak_relative_max"), f"{ident}.cutoff[{cutoff}].spectrum_peak_relative_max")
            finite_nonnegative(row.get("ground_energy_above_complete_eV"), f"{ident}.cutoff[{cutoff}].ground_energy_above_complete_eV")


def main() -> int:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    if data.get("schema_version") != "xmd-public-evidence-catalog-v1":
        raise SystemExit("unexpected evidence catalog schema")
    if data.get("publication_state") != "historical-retained-run":
        raise SystemExit("catalog must remain explicitly historical-retained-run")
    items = data.get("items")
    if not isinstance(items, list) or len(items) != 9:
        raise SystemExit("evidence catalog must contain exactly nine retained cases in v1")
    ids = [item.get("id") for item in items if isinstance(item, dict)]
    if len(ids) != 9 or set(ids) != EXPECTED_IDS or len(set(ids)) != 9:
        raise SystemExit("evidence catalog case identities drifted")

    tolerances = data.get("tolerances")
    if not isinstance(tolerances, dict):
        raise SystemExit("atomic tolerances missing")
    slugs: set[str] = set()
    items_root = (EVIDENCE / "items").resolve()
    for item in items:
        ident = item["id"]
        item_slug = slug(item)
        if item_slug != EXPECTED_SLUGS[ident] or item_slug in slugs:
            raise SystemExit(f"invalid or duplicate evidence slug: {item_slug!r}")
        slugs.add(item_slug)
        detail = (EVIDENCE / "items" / item_slug / "index.html").resolve()
        if items_root not in detail.parents or not detail.is_file():
            raise SystemExit(f"missing/unsafe evidence detail page: {item_slug}")
        digest = item.get("comparison_sha256")
        if not isinstance(digest, str) or len(digest) != 64 or any(c not in HEX for c in digest):
            raise SystemExit(f"invalid recorded comparison SHA-256: {ident}")
        if item.get("status") != "executed-passed":
            raise SystemExit(f"unexpected imported historical status: {ident}")
        family = item.get("family")
        if family in {"atomic", "thermal"}:
            validate_atomic(item, tolerances)
        elif family == "cluster":
            validate_cluster(item)
        else:
            raise SystemExit(f"unsupported family for {ident}: {family!r}")

    run = data.get("run")
    if not isinstance(run, dict) or run.get("platforms") != ["Windows", "Linux"]:
        raise SystemExit("historical run platform declaration drifted")
    source = run.get("source_head_sha")
    tested = run.get("tested_merge_sha")
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
    if "cluster records use their own cluster contract" not in detail_js:
        raise SystemExit("cluster contract separation is missing")
    if "Historical retained comparison record" not in detail_js or "Executed · passed" in detail_js:
        raise SystemExit("detail UI must not self-attest imported historical pass state")
    if "Math.min(100" not in detail_js or "Number.isFinite" not in detail_js:
        raise SystemExit("detail renderer lacks bounded finite numeric guards")

    index = (EVIDENCE / "index.html").read_text(encoding="utf-8")
    catalog_js = (EVIDENCE / "catalog.js").read_text(encoding="utf-8")
    if "Scientific evidence catalog" not in index or "Loading evidence catalog" not in index:
        raise SystemExit("Evidence landing page is no longer catalog-first")
    if "overview.html" not in index or "historical retained result" not in catalog_js or "executed · passed" in catalog_js:
        raise SystemExit("catalog must retain overview and avoid self-attested pass badges")

    overview = EVIDENCE / "overview.html"
    if not overview.is_file():
        raise SystemExit("previously accepted Evidence overview is not retained")
    overview_text = overview.read_text(encoding="utf-8")
    for marker in ("Scientific evidence dashboard", "Atomic spectrum margin", "Cluster cutoff convergence", "Evidence drill-down", "<dialog"):
        if marker not in overview_text:
            raise SystemExit(f"retained Evidence overview lost accepted feature: {marker}")
    # At /evidence/overview.html the snapshot's original relative navigation is
    # still correct: ../ -> site root, ../roadmap/ -> roadmap, ./ -> catalog.
    for marker in ('href="../"', 'href="../roadmap/"', 'href="./"'):
        if marker not in overview_text:
            raise SystemExit(f"retained Evidence overview navigation drifted: {marker}")

    print("Evidence catalog OK: 9 typed historical cases, safe routes, retained analytics overview")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
