## Repo Rules

- Reuse existing components, hooks, utilities, and patterns before creating anything new.
- Place reusable UI under `@/components/...`.
- Do not edit `prisma/schema.prisma`. If a task requires a data-model change, explain the required database change to the user, why it is needed, and where the current model is limiting the implementation. You may suggest proper SQL Syntax.
- Avoid `as` and `any`. Prefer correct typing inferred from `@/generated/prisma`, then refine with utilities such as `Partial<>`, `Omit<>`, and narrowers where needed.
- Cache client-side data with `useQuery`.
- Never hardcode query keys. Define and use feature-local `QueryKeys.ts` or `queryKeys.ts` files.
- All user-facing text must be German and use the Hoeflichkeitsform (`Sie`).

## Test Rules

- For every module you touch, try to add or update useful tests that cover the changed behavior.
- Prefer behavior-focused tests over snapshot-like or superficial assertions.
- If a touched module cannot reasonably be tested in the same change, document the gap and the reason instead of silently skipping it.
