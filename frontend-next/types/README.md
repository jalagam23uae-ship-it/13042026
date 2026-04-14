# types/

Domain and UI TypeScript types shared across the app.

**Do not duplicate API types here.** Types that mirror backend models come from `lib/api/schema.ts`, which is generated via `npm run api:gen`. Import those from `@/lib/api/schema` (or via the typed `browserClient` / `serverClient` from `@/lib/api/client`).

This folder is for:

- UI-only types that have no backend equivalent.
- Derived/composed types used by more than one feature (e.g. a view-model that merges an API payload with runtime state).
- Enums or unions used cross-feature.

One domain per file, kebab-case filename (e.g. `course.ts`, `assignment.ts`).
