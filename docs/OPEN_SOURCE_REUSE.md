# Open-source technical review and reuse plan

| Reference | Verified strengths | Reuse approach | Limitations |
|---|---|---|---|
| [Artaeon/1300io](https://github.com/Artaeon/1300io) | Camera workflow, defect reporting, PDF embedded photos; React/Vite + Express/Postgres | Use UX and PDF data layout as design references, reimplement in Next.js | Domain-specific to Austrian building audits; server stack differs |
| [nigdanil/AuditM-Field](https://github.com/nigdanil/AuditM-Field) | Config-driven checklists, photo annotations, offline-first IndexedDB, PWA | Study JSON checklist config and mobile photo flow | Mock local auth, no Supabase + verified report email pipeline |

No third-party source has been copied into this starter. Licenses must be checked before any future source-level reuse.

## Phase 1 scope
Self-contained front-end 5S inspector with rating and submission rules; schema migration proposal. This is not yet a production system.

## Phase 2 priorities
1. Wire anonymous Supabase session, verify `is_anonymous` and row ownership; use server-side privileged credentials only on server.
2. Secure inspection creation + ownership-checked uploads in private Storage; sanitize EXIF; deterministic path.
3. Server-side atomic finalize transaction validating every 1..5 answer and photo/note for 1..2.
4. Produce server PDF with embedded Korean font and images; email verified recipient with queue/idempotency.
5. Introduce admin-only template management and seeded read-only site/template access.
6. Integrate Vercel and smoke-test production after credentials are configured.

## Critical implementation gap
Currently client demo image bytes are memory-only (not persisted). PDF button is browser print. Production submission / email must wait for server integration and explicit service configuration.
