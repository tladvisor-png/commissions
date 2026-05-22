import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase URL loaded:', !!supabaseUrl)
console.log('Supabase anon key loaded:', !!supabaseAnonKey)

if (!supabaseUrl) {
  console.error('[Supabase] NEXT_PUBLIC_SUPABASE_URL est manquant dans .env.local')
}
if (!supabaseAnonKey) {
  console.error('[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY est manquant dans .env.local')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
