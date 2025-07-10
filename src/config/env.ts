import zod  from 'zod';

const envSchema = zod.object({
  DATABASE_URL: zod.string().url(), // Ensure the URL is valid
});

export const env = envSchema.safeParse(process.env);
