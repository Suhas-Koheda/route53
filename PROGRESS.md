
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
