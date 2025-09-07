import { createClient } from '@supabase/supabase-js';

// Use Vite environment variables. If you prefer .env files with REACT_APP_* names,
// add mappings in your build process, but Vite expects VITE_* prefixed vars.
VITE_SUPABASE_URL=https://pkqeyicyxcbtcsxubpsd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcWV5aWN5eGNidGNzeHVicHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMjYwNjUsImV4cCI6MjA3MjgwMjA2NX0.qsSh_zyJspth8WsbwCEJs0eeHqJN3cfN7B6Uy2UiSgM

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // warn during development if env vars are missing
  // eslint-disable-next-line no-console
  console.warn('Supabase environment variables are not set. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
