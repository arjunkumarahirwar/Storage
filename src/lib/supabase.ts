import { createClient } from '@supabase/supabase-js'

/**
 * These are public (browser) credentials — the anon/publishable key only grants
 * what the row level security policies allow. Never put a service_role key here.
 */
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://xvehdhwvkjdwqayoonxg.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_NKOjwqy2JtKqk7Se71JiNw_ZnU_teP7'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
