/// <reference types="vite/client" />

// Only VITE_-prefixed variables reach the browser bundle; the OpenRouter key is
// deliberately absent here because it must stay server-side.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
