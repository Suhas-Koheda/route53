1. Backend is a FastAPI app split across auth, hosted-zone, and record routers.
2. SQLAlchemy models use SQLite, with per-user hosted-zone ownership and cascading records.
3. Startup creates current-schema tables; incompatible local databases require a manual reset.
4. Auth uses bcrypt passwords and bearer tokens stored in the sessions table.
5. Record schemas validate DNS values, routing policies, and hosted-zone name scope.
6. Backend CRUD supports filtering, pagination counts, export, and BIND import.
7. Frontend is a Next.js App Router app built with Cloudscape components.
8. Frontend auth persists a token in localStorage and a session cookie for route protection.
9. Hosted-zone pages provide CRUD; zone detail includes record management and import/export.
10. Existing deployment files/configuration will be preserved per the user’s instruction.
