# Concurrency & multi-branch usage

This app is safe for **many users and branches** hitting the same MongoDB database at the same time, with the behaviours below.

## What is already safe

| Area | Behaviour |
|------|-----------|
| **Bill numbers** | `Counter` uses atomic `findByIdAndUpdate` + `$inc`. Inside a transaction (when supported), the counter increments together with the bill so a failed save does not skip or duplicate numbers. |
| **Stock on sale** | Each line uses `$inc: { currentStock: -qty }` on `Product`. MongoDB applies each `$inc` atomically, so concurrent sales on the same SKU compose correctly (no “lost update” on quantity). |
| **Stock import** | Same: `$inc` for quantity; batch import runs in one **transaction** when the database supports it. |
| **Stock adjustment** | Uses `$inc` with a filter so negative adjustments cannot drive stock below zero when two users adjust at once (no read–modify–write race). |
| **Unique bill number** | `billNumber` is unique; duplicate insert fails with a clear error instead of silent corruption. |

## Multi-document transactions (recommended for production)

For **bill creation** and **stock import**, the server runs a **multi-document transaction** when MongoDB allows it:

- **MongoDB Atlas** (M0+) — supported  
- **Replica set** (self-hosted) — supported  
- **Single `mongod` with no replica set** — transactions are **not** supported; the server **falls back** to the previous behaviour (each `$inc` is still atomic, but bill + stock + ledger rows are not rolled back together if a late step fails).

**Recommendation:** use **Atlas** or any deployment with a **replica set** so bill + stock + `StockTransaction` stay consistent under load.

## Limits & good practice

1. **Same bill, two editors** — Updating the same pending bill from two screens is **last-write-wins**. For stricter control you could add version fields (`__v`) and reject stale updates (not implemented by default).  
2. **Product master data** — Editing the same product in two places: last update wins on those fields; stock still stays consistent because sales use `$inc`.  
3. **Rate limits / scaling** — Many branches on one DB is fine for typical shop load; if traffic grows very large, use connection pooling (default in Mongoose), indexes (already on hot paths), and optionally read scaling later.

## Summary

- Concurrent **sales** and **imports** across 10–12 branches do **not** corrupt stock counts because updates are atomic.  
- With a **replica set**, **bills and stock movements stay aligned** even if something fails mid-save.  
- **No silent data loss** from normal concurrent inserts/edits; worst cases are explicit errors (e.g. duplicate key) or overwrites when two people edit the **same document** at the same time.
