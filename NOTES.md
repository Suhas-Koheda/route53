# NOTES.md

## Project summary (10-line state read)

1. **Backend** is a single-file FastAPI app (`backend/main.py`) with inline routes; `crud.py`, `models.py`, `schemas.py`, `database.py` (hardcoded `sqlite:///./route53.db`) live alongside it; 9 happy-path tests in `test_api.py` all pass.
2. **Auth** is mock session tokens in SQLite (`sessions` table); `Authorization: Bearer <token>` header; 7-day expiry checked inline in the `get_user_id` dependency.
3. **Hosted zones** CRUD works; duplicate zone name per user returns 409; zones auto-create 4 NS + 1 SOA records (`record_count=5`); `record_count` maintained as a mutable counter column.
4. **Records** CRUD works; per-user access enforced via zone ownership; types A–SOA allowed; no value/format validation per type; no duplicate (name,type,set_identifier) enforcement; `routing_policy`/`weight`/`region`/`failover_type`/`set_identifier` columns exist but are unvalidated.
5. **Tests** use an in-memory SQLite with StaticPool and override `get_db`; the one isolation test currently asserts the WRONG behavior (user B deleting A's zone returns 200).
6. **Frontend** is Next.js 16 App Router with `src/app/*` pages (hosted-zones list, zone detail with records, login, signup, stub pages); Cloudscape components used but several raw `<select>`/error divs remain.
7. **Frontend API layer** (`src/lib/api.ts`) is hand-rolled per-function fetch wrappers; no shared error parser, no 401 handling, no export/import/getZone; `types.ts` missing.
8. **AuthContext** stores token/user in localStorage + a `session` cookie (max-age 86400, no SameSite/Secure); signup page duplicates cookie logic and imports `loginApi` unused.
9. **proxy.ts** gates routes via cookie; `AppShell.tsx` has top nav + side nav + plain-text breadcrumbs; Build/lint are the only frontend checks wired.
10. **Repo hygiene**: no `.gitignore` coverage for `route53.db` is present at root (it has `*.db`), Dockerfile + run.sh exist but are unverified; `next.config.ts` hardcodes personal IPs in `allowedDevOrigins`; README documents the current (pre-change) state.

## Phase 1 assumptions
- All API paths/field names stay identical; only shapes allowed to grow (new response fields `created_by`, `zone_id_str`, new header `X-Total-Count`).
- `set_identifier` empty-string normalization means existing NULL rows are treated as "" for duplicate checks after migration.
- NS/SOA protection applies to apex records only (name == zone apex).
