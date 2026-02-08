import { createClient } from "@supabase/supabase-js";

// Create a separate client for function calls that bypasses authentication
export const supabaseFunctions = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);
