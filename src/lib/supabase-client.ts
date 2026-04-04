import { createClient } from '@supabase/supabase-js';

// Standard Client für normale Operationen (mit Anon Key)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Realtime Client mit Service Role (umgeht RLS)
export const supabaseRealtimeClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    auth: {
      persistSession: false,
    },
  }
);

export async function setSupabaseAuth(accessToken: string) {
  try {
    const { error } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    });

    if (error) {
      throw new Error(
        `[Supabase Auth] Error setting session: ${error.message}`
      );
    }
  } catch (error) {
    console.error('[Supabase Auth] Unexpected error:', error);
  }
}

export const getPublicStorageUrlFromPath = (
  value: string,
  bucket: string
): string => {
  return !value.includes(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/${bucket}/${value}`
    : value;
};
