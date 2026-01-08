import { createClient } from '@supabase/supabase-js';

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const getPublicStorageUrlFromPath = (
  value: string,
  bucket: string
): string => {
  return !value.includes(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/${bucket}/${value}`
    : value;
};
