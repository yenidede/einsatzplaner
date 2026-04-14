## Repo Rules

- Reuse existing components, hooks, utils, patterns before new ones.
- Place reusable UI in `@/components/...`.
- Do not edit `prisma/schema.prisma`.
  - If data model change needed, explain required change, why needed, how current model blocks impl.
  - Suggest SQL OK.
  - If schema change required or strongly recommended, stop. Ask user for explicit action.
- Avoid `as` and `any`. Prefer types from `@/generated/prisma`, refine with `Partial<>`, `Omit<>`, proper narrowing.
- Cache client-side data with `useQuery`.
- Never hardcode query keys. Use feature-local `QueryKeys.ts` or `queryKeys.ts`.
- All user-facing text in German. Use Höflichkeitsform (`Sie`) + proper umlauts (`Ä`, `Ö`, `Ü`), never `Ae`, `Oe`, `Ue`.

## Test Rules

- For every touched module, add or update useful tests when reasonable.
- Prefer behavior-focused tests over snapshots or superficial assertions.
- If touched module cannot reasonably be tested in same change, document gap + reason.
