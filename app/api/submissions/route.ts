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

    // Get user profile with institution
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, institution")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const role = profile.role
    const institution = profile.institution

    // Base query - always filter by institution unless head_of_programs
    let query = supabase
      .from("submissions")
      .select("*")
      .order("updated_at", { ascending: false })

    // Head of Programs can see all submissions
    if (role !== "head_of_programs") {
      query = query.eq("institution", institution)
    }

    // Additional role-based filtering
    if (role === "instructor") {
      query = query.eq("instructor_id", user.id)
    } else if (!["pc", "amo", "head_of_programs", "institution_manager", "records", "senior_instructor"].includes(role)) {
      query = query.in("status", ["amo_approved", "final_archived"])
    }

    const { data, error } = await query

    if (error) {
      console.error("Submissions fetch error:", error)
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("GET /api/submissions error:", error)
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
    const { skill_area, skill_code, cohort, test_date, description, cluster } = body

    // Get profile info including institution
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, institution")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json(
        { error: "User profile not found. Please contact administrator." },
        { status: 400 }
      )
    }

    if (!profile.institution) {
      return NextResponse.json(
        { error: "User institution not found. Please contact administrator." },
        { status: 400 }
      )
    }

    // Generate submission ID
    const now = new Date()
    const submissionId = `RFA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 10000)).padStart(5, "0")}`

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        submission_id: submissionId,
        title: `${skill_area} - ${cohort}`,
        skill_area,
        skill_code,
        cluster,
        cohort,
        test_date,
        instructor_id: user.id,
        instructor_email: profile.email,
        instructor_name: profile.full_name,
        institution: profile.institution,
        description,
        status: "draft",
      })
      .select()

    if (error) {
      console.error("Submission insert error:", error)
      throw error
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    console.error("POST /api/submissions error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create submission" },
      { status: 500 },
    )
  }
}