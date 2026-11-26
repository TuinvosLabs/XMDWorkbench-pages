# HyperTree Research Observatory

Public, sanitized, static research presentation. The legacy Research Map stays unchanged.

- index.html: current overview, separated cost charts, timeline and wave status.
- hypergraph.html: complete active structural projection of the selected verified snapshots; explicit relation vertices, ordered incidence and layer filtering.
- timeline.json: append-only research events; unique IDs; ISO dates; dated-only historical entries do not invent a time. Metrics must retain their original cost/goal/cut contract.
- hypergraph.json: schema observatory-hypergraph/1. Stable public IDs; allowlisted display names only. The private source ledger contains original IDs, immutable pins, and verification details. No private GitHub links, raw claims, guards, internal review details, runner metadata or raw evidence.
- backlog.json: fixed wave definitions. Current statuses are obtained by replaying event updates.
- publication.json: data consistency manifest. Change atomically with the data.
- validate.mjs: run with Node.js 20+ before publication.

## Update contract

Append only verified research checkpoints. Preserve existing event IDs, original dates, values and descriptions; for any correction append a superseding/correction event. Never infer a completed wave from a claim. Do not mix raw, protected or reduced word costs or interpret producer witnesses as primitive optima. For a graph update verify the canonical source and each append-only parent/child digest in the private research repository; keep prior graph versions available. Do not promote candidate overlays. Preserve public-ID mappings in the private ledger. Do not copy the private ledger to this repository. If new scope, permission or snapshot identity is uncertain, retain the last good public dataset.

The hourly publication task reads the private coordination register with the authorized account, produces only approved sanitized derived metadata, validates all data, and commits only changed files to the existing Pages main branch. GitHub Pages builds from the existing configuration; no new infrastructure. A commit does not prove live deployment; check its Pages run. If nothing changes, do not create an empty commit.

The publication is not an independent scientific acceptance decision.
