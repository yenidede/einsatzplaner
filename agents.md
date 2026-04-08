## Repo Rules

- Reuse existing components, hooks, utilities, and patterns before creating new ones.
- Place reusable UI in `@/components/...`.
- Do not edit `prisma/schema.prisma`.
  - If a data model change is needed, explain the required change, why it is needed, and how the current model limits the implementation.
  - You may suggest SQL.
  - If a schema change is required or strongly recommended, stop and ask the user for explicit action.
- Avoid `as` and `any`. Prefer types from `@/generated/prisma`, refined with utilities like `Partial<>`, `Omit<>`, and proper narrowing.
- Cache client-side data with `useQuery`.
- Never hardcode query keys. Use feature-local `QueryKeys.ts` or `queryKeys.ts`.
- All user-facing text must be in German, use the Höflichkeitsform (`Sie`), and use proper umlauts (`Ä`, `Ö`, `Ü`), never `Ae`, `Oe`, or `Ue`.

## Test Rules

- For every touched module, add or update useful tests when reasonably possible.
- Prefer behavior-focused tests over snapshots or superficial assertions.
- If a touched module cannot reasonably be tested in the same change, document the gap and the reason.
