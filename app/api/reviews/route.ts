import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { submission_id, reviewer_role, status, comments } = body

    // Get reviewer profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json(
        { error: "Failed to fetch profile", details: profileError.message },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (profile?.role !== reviewer_role && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized to review as this role" },
        { status: 403 }
      )
    }

    // Fetch submission (FULL DATA — needed for email)
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, status, title, instructor_email, instructor_name")
      .eq("id", submission_id)
      .single()

    if (submissionError) {
      console.error("Submission fetch error:", submissionError)
      return NextResponse.json(
        { error: "Submission not found", details: submissionError.message },
        { status: 404 }
      )
    }

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    // AMO guard
    if (
      reviewer_role === "amo" &&
      submission.status !== "pc_approved" &&
      profile?.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Submission must be PC approved before AMO review" },
        { status: 403 }
      )
    }

    // Upsert review
    const { data: reviewData, error: reviewError } = await supabase
      .from("reviews")
      .upsert({
        submission_id,
        reviewer_id: user.id,
        reviewer_role,
        status, // approved | rejected
        comments,
        reviewed_at: new Date().toISOString(),
      })
      .select()

    if (reviewError) {
      console.error("Review upsert error:", reviewError)
      throw reviewError
    }

    // Map workflow status
    let newStatus: string | null = null

    if (reviewer_role === "pc") {
      newStatus = status === "approved" ? "pc_approved" : "pc_rejected"
    }

    if (reviewer_role === "amo") {
      newStatus = status === "approved" ? "amo_approved" : "amo_rejected"
    }

    // Update submission status
    if (newStatus) {
      const { error: updateError } = await supabase
        .from("submissions")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission_id)

      if (updateError) {
        console.error("Submission update error:", updateError)
        throw updateError
      }
    }

    return NextResponse.json(reviewData[0], { status: 201 })
  } catch (error) {
    console.error("Review API error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create review",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    if (error) {
      console.error("Reviews fetch error:", error)
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("GET Reviews error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch reviews",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}