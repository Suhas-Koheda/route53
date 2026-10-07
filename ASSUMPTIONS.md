# Assumptions

- The existing deployment files and deployment approach remain unchanged, per the user's direction.
- The ignored local SQLite database is disposable. Schema changes use a fresh database rather than startup migrations; the prior local database was removed and recreated.
- Apex NS data is represented by four rows for the four name servers. Each row gets a distinct `set_identifier` equal to its target so the required unique record key can coexist with the four values.
- `zone_id_str` is deterministically generated from the database row ID and stored once on creation.
- No hosted demo URL is available yet; README keeps a placeholder for the user to fill after deployment.
