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

    // Get submissions relevant to user
    const { data: submissions } = await supabase
      .from("submissions")
      .select("*")
      .or(`instructor_id.eq.${user.id},current_reviewer_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })

    // Get reviews pending for user
    const { data: reviews } = await supabase
      .from("reviews")
      .select("*")
      .eq("reviewer_id", user.id)
      .eq("status", "pending")

    const notifications = [
      ...(submissions?.map((s) => ({
        id: s.id,
        type: "submission",
        title: `${s.title} - ${s.status}`,
        message: `Submission has been ${s.status.replace(/_/g, " ")}`,
        timestamp: s.updated_at,
        read: false,
      })) || []),
      ...(reviews?.map((r) => ({
        id: r.id,
        type: "review",
        title: `Review required`,
        message: `A submission is pending your ${r.reviewer_role} review`,
        timestamp: r.created_at,
        read: false,
      })) || []),
    ]

    return NextResponse.json(notifications.slice(0, 20))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notifications" },
      { status: 500 },
    )
  }
}
