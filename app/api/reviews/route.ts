import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { submission_id, reviewer_role, status, comments } = body

    // Get reviewer role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== reviewer_role && profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized to review as this role" }, { status: 403 })
    }

    // Update or create review
    const { data, error } = await supabase
      .from("reviews")
      .upsert({
        submission_id,
        reviewer_id: user.id,
        reviewer_role,
        status,
        comments,
        reviewed_at: new Date().toISOString(),
      })
      .select()

    if (error) throw error

    // Update submission status if approved/rejected
    if (status === "approved" || status === "rejected") {
      const newStatus = status === "approved" ? "amo_review" : "pc_review"
      await supabase.from("submissions").update({ status: newStatus }).eq("id", submission_id)
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create review" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get("submission_id")

    let query = supabase.from("reviews").select("*")

    if (submissionId) {
      query = query.eq("submission_id", submissionId)
    } else {
      query = query.eq("reviewer_id", user.id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reviews" },
      { status: 500 },
    )
  }
}
