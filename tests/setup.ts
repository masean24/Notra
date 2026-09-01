import { config } from "dotenv"
import { resolve } from "node:path"

// Load .env.local so integration tests can reach the real Supabase project.
// When it is absent, integration suites skip themselves.
config({ path: resolve(process.cwd(), ".env.local"), quiet: true })

export const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
