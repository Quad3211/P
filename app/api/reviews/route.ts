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

    // Allow PC, AMO, IM, and Admin to review
    const allowedRoles = ["pc", "amo", "im", "admin"]
    if (!allowedRoles.includes(profile?.role || "")) {
      return NextResponse.json({ error: "Unauthorized to review" }, { status: 403 })
    }

    // Validate reviewer role matches or is secondary approver
    const isSecondaryApprover = ["im", "admin"].includes(profile?.role || "")
    const isPrimaryReviewer = profile?.role === reviewer_role

    if (!isPrimaryReviewer && !isSecondaryApprover) {
      return NextResponse.json({ error: "Unauthorized to review as this role" }, { status: 403 })
    }

    // Get submission details for logging
    const { data: submission } = await supabase
      .from("submissions")
      .select("submission_id, title, status, instructor_name")
      .eq("id", submission_id)
      .single()

    // Create or update review
    const { data: reviewData, error: reviewError } = await supabase
      .from("reviews")
      .upsert({
        submission_id,
        reviewer_id: user.id,
        reviewer_role: isSecondaryApprover ? "secondary" : reviewer_role,
        status,
        comments,
        reviewed_at: new Date().toISOString(),
      })
      .select()

    if (reviewError) throw reviewError

    // Update submission status based on review
    let newSubmissionStatus = submission?.status
    if (status === "approved") {
      if (reviewer_role === "pc" || (isSecondaryApprover && submission?.status === "submitted")) {
        newSubmissionStatus = "amo_review"
      } else if (reviewer_role === "amo" || (isSecondaryApprover && submission?.status === "amo_review")) {
        newSubmissionStatus = "approved"
      }
    } else if (status === "rejected") {
      newSubmissionStatus = "rejected"
    }

    await supabase.from("submissions").update({ status: newSubmissionStatus }).eq("id", submission_id)

    // Create comprehensive audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: isSecondaryApprover
        ? `Secondary review (${profile?.role}): ${status} submission`
        : `${reviewer_role.toUpperCase()} review: ${status} submission`,
      action_type: status,
      submission_id: submission_id,
      details: {
        reviewer_name: profile?.full_name,
        reviewer_role: profile?.role,
        review_type: isSecondaryApprover ? "secondary" : "primary",
        previous_status: submission?.status,
        new_status: newSubmissionStatus,
        comments: comments,
        submission_title: submission?.title,
        submission_id: submission?.submission_id,
      },
    })

    return NextResponse.json(reviewData[0], { status: 201 })
  } catch (error) {
    console.error("Review error:", error)
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

    let query = supabase
      .from("reviews")
      .select(`
        *,
        reviewer:reviewer_id(full_name, email, role)
      `)
      .order("created_at", { ascending: false })

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