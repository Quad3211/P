import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import type { NextProxy } from "next/server"

// ✅ must be named "proxy" or default export
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
}
