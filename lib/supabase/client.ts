import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    console.error("[Supabase Client] Missing environment variables");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
    console.error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
      supabaseKey ? "SET" : "MISSING"
    );
    throw new Error("Supabase environment variables are not configured");
  }

  console.log("[Supabase Client] Creating client with URL:", supabaseUrl);

  return createBrowserClient(supabaseUrl, supabaseKey);
}
