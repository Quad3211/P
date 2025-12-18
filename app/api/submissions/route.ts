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

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const role = profile.role

    let query = supabase.from("submissions").select("*").order("updated_at", { ascending: false })

    // Role-based filtering
    if (role === "instructor") {
      // Instructors only see their own submissions
      query = query.eq("instructor_id", user.id)
    } else if (role !== "pc" && role !== "amo" && role !== "admin") {
      // Non-reviewer, non-instructor: only see AMO-approved or later
      query = query.in("status", ["amo_approved", "final_archived"])
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}



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
    const { skill_area, skill_code, cohort, test_date, description } = body

    // Get profile info
    const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", user.id).single()

    // Generate submission ID
    const now = new Date()
    const submissionId = `RFA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 10000)).padStart(5, "0")}`

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        submission_id: submissionId,
        skill_area,
        skill_code,
        cohort,
        test_date,
        instructor_id: user.id,
        instructor_email: profile?.email,
        instructor_name: profile?.full_name,
        description,
        status: "draft",
      })
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    console.error(error.message);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create submission" },
      { status: 500 },
    )
  }
}
