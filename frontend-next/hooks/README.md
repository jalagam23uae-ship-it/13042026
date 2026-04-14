# hooks/

Custom React hooks.

- One hook per file.
- Filename: `use-<name>.ts` (or `.tsx` when JSX is needed).
- Export the hook as a named export matching the camelCase filename (e.g. `useCourseProgress` in `use-course-progress.ts`).
- Keep hooks pure and framework-agnostic where possible; server-only utilities belong in `lib/`.
