# Decision record: no external decision-model dependency (2026-09-22)

## Decision

BaseRate ships with a fully in-house, deterministic regime classifier. No Jev dependency,
no third-party decision API on the judge-facing path.

## Why

1. Access integrity: the official TypeSafe console is at capacity ("we're full", verified live);
   the working key routes through a third-party mirror with 5 free decisions/month. A judge-facing
   feature behind an unofficial proxy with a hard quota contradicts BaseRate's own thesis
   (no fabrication, full provenance, reproducible numbers).
2. Reproducibility: deterministic classification gives "same inputs, same regime tag, every time",
   which strengthens the calibration/trust story more than a model call would.
3. Demo ops: zero quota guardrails, zero red-screen risk during judge reviews.

## What was verified before deciding (kept for the record)

- Jev 1.13.0 live via mirror: batched typed questions (choice/noul/score) in one call,
  charged 1 decision, ~0.5s. Full probe: docs/jev-probe.md (unchanged reference).
- Jev was already designed as removable enhancer; no engine code ever depended on it.
- If the official TypeSafe key clears the waitlist before Sep 27, re-adding a dossier-time
  classification layer is a one-afternoon change (adapter pattern preserved in git history,
  engine/jev_adapter.py removed from main tree, recoverable from the 2026-09-22 commit).

## Scorekeeper re-keying

Calibration ledger keys on the deterministic classifier's regime tags. Unchanged mechanics.
