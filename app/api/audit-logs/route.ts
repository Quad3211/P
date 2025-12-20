import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "head_of_programs" && profile?.role !== "records" && profile?.role !== "institution_manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get("submission_id")
    const actionType = searchParams.get("action_type")
    const userId = searchParams.get("user_id")

    let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false })

    if (submissionId) {
      query = query.eq("submission_id", submissionId)
    }
    if (actionType) {
      query = query.eq("action_type", actionType)
    }
    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch audit logs" },
      { status: 500 },
    )
  }
}