# ASSUMPTIONS.md

## Phase 1
- **DB unique constraint on records**: The spec asks for a DB-level `UniqueConstraint(zone_id, name, type, set_identifier)`. This is **incompatible** with the required seed data (4 apex NS records all share `name=zone, type=NS, set_identifier=""`, differing only in `value`), which would raise `IntegrityError` on every zone creation. To preserve the required behavior (record_count=5 per zone, working create), duplicate rejection is enforced in code at the API layer (returns 409) and the `zone_id` index is present in the model. The frontend-facing behavior (409 on duplicate) is exactly as specified.
- **set_identifier normalization**: missing/NULL `set_identifier` is normalized to `""` in crud (create/update/dup-check) and the startup migration backfills existing NULL rows to `""`.
- **Record name rules**: single-label names (e.g. `www`, `mail`) and the zone apex (`@` or the zone name) are accepted; a full name must end with the zone name; anything else (e.g. `other.com`) is rejected with 400.
- **`HostedZoneUpdate`** now only accepts `comment` (no rename, no type change). The frontend caller is updated in Phase 2/3 to stop sending `name`/`zone_type`.
- **X-Total-Count**: always returned on list endpoints; when no query params are given the endpoint still returns the full plain-JSON array (total == full length).
- **Migration** is idempotent and runs at app startup (`main.py` calls `run_migrations(engine)`); it is safe to run on every boot.
