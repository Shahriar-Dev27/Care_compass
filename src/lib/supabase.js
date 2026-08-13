import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Failing here beats a hundred confusing 401s later.
if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.')
}

// The publishable key is meant for the browser: every table it can reach is
// guarded by row level security, so a session decides what the query returns.
export const supabase = createClient(url, key)
