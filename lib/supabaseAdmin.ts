import { createClient } from "@supabase/supabase-js";

// 👇 use only in API routes, server actions, webhooks
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔑 never expose this to client
);
