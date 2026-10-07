
## Phase 1: Backend correctness
Files changed: backend/database.py, backend/models.py, backend/schemas.py, backend/crud.py, backend/dependencies.py (new), backend/routers/auth.py (new), backend/routers/zones.py (new), backend/routers/records.py (new), backend/main.py, backend/requirements.txt, backend/test_api.py, frontend/src/app/hosted-zones/page.tsx (minimal caller fix).
What I tested and how:
- `pytest -q`: 25 passed (was 9). Covers every value validator, expired session (401), cross-user record isolation, duplicate 409, NS/SOA protection, routing rules, name-in-zone rule, export/import round-trip, X-Total-Count header, delete 404, RecordUpdate uppercase, second-SOA block.
- Migration: built a pre-migration old-schema DB and confirmed `run_migrations` adds created_by/zone_id_str, backfills, normalizes set_identifier NULL->''. Live route53.db already migrated (created_by + zone_id_str present).
- Started uvicorn against a copy of the DB: signup, create zone (record_count=5, created_by, zone_id_str present), create record (name normalized www->www.flow.com, set_identifier ''), BIND export valid, invalid A value 422, X-Total-Count header present.
- Frontend build passes; minimal caller fix (edit zone sends comment only, name/type disabled in edit). Version identifiers: `pytest` 25/25, `next build` OK.
Known risks / notes:
- DB-level UniqueConstraint on records (zone_id,name,type,set_identifier) is INCOMPATIBLE with the required 4-NS apex seed (would raise IntegrityError). Duplicate rejection is enforced in code (409) + zone_id index present. Documented in ASSUMPTIONS.md.
- Frontend `pnpm run lint` still reports 41 pre-existing errors/7 warnings, almost entirely in src/lib/api.ts (`any` types), src/context/AuthContext.tsx (setState-in-effect), src/proxy.ts (unused PUBLIC_PATHS), and raw <select>/error-divs in pages. These are in files Phase 2/3 explicitly rewrite; deferred there. Build passes.

## Phase 2: Frontend foundation
Files changed: frontend/src/lib/types.ts (new), frontend/src/lib/api.ts (rewritten around single request<T>()), frontend/src/context/AuthContext.tsx (add signup, new cookie, use signup), frontend/src/app/signup/page.tsx (use AuthContext signup, drop loginApi), frontend/src/app/page.tsx (fix useEffect deps), frontend/src/proxy.ts (drop unused PUBLIC_PATHS), frontend/src/app/login/page.tsx (drop any), frontend/src/app/hosted-zones/page.tsx (useCollection, getZone types), frontend/src/app/hosted-zones/[id]/page.tsx (getZone, useCollection, Cloudscape Select), frontend/src/app/profiles/page.tsx (unused import), frontend/src/components/ClientOnly.tsx (suppress rule), package.json (+ @cloudscape-design/collection-hooks).
What I tested and how:
- `pnpm run build`: passes (TypeScript + Next 16 compile). The records detail tab now uses getZone(id) (verified by type check).
- `pnpm run lint`: now 0 errors / 0 warnings (was 41 errors/7 warnings). collection-hooks added.
Known risks:
- Flashbar items typed as Array<object> in pages to satisfy Cloudscape's Flashbar prop variance; will be tightened in Phase 3.
- The `delete` api no longer logs errors (treated as ok); accept.

## Current pass (2026-10-07)

User direction for this pass: do not add or run tests, do not add startup migrations, and keep the existing deployment files unchanged. The prior ignored `backend/route53.db` was removed and recreated from the current SQLAlchemy schema. The historical migration notes above describe the earlier implementation; they do not describe the current startup behavior.

- **Backend/schema:** record unique constraint and zone index are part of the fresh schema; missing identifiers normalize to empty strings in CRUD. Startup now only calls `create_all`; it does not migrate an existing DB. Added `backend/seed.py` and `backend/.env.example`.
- **Frontend:** removed personal `allowedDevOrigins`, fixed search focus to target the Cloudscape input, moved dark-mode control into the top navigation, loaded zone names in breadcrumbs, added client-side routing-field errors, and switched BIND import to Cloudscape FileUpload.
- **Docs/repo:** added `frontend/.env.example`, refreshed README with API/schema/architecture/setup/DB reset/deployment notes, and updated assumptions. Existing Dockerfile and run.sh were left untouched.
- **Run state:** backend `uvicorn` is running on port 8000; the existing Next dev server is running on port 3000. Seed data is present for `demo@example.com` / `Demo@12345`.
- **Verification this pass:** `pnpm run build` and `pnpm run lint` pass. The existing pytest suite had passed 25 tests earlier in this conversation, before the user asked not to run tests; it was not rerun after the latest database reset and edits. A seed attempt initially exposed an underscore-name validation mismatch; the sample owner name was changed to a supported name and seed then completed.
- **Known limitation:** no hosted demo link is available; the README contains a placeholder. The DB reset discarded the prior ignored local DB contents, as authorized.
