Use existing components wherever possible.
Try to reuse components wherever possible.
Save components to "@/components/...".
Do not alter the schema.prisma at all but instead suggest changes to the database model to the user and explain why they are necessary and should be implemented.

Try not to use "as" or "any"; instead type correctly. Types should be inferred from '@/generated/prisma' wherever possible. These inferred types can be altered using TypeScript narrowers like Partial<> or Omit<>, ... The import could look like this: import { einsatz } from '@/generated/prisma';

Data should be locally cached using useQuery. useQuery QueryKeys should never be hardcoded but come from a seperate QueryKeys.ts file.

Any User facing text should be in german. Use the Höflichkeitsform ("Sie" instead of "Du").
