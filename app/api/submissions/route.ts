import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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
      return NextResponse.json({ error: "Failed to fetch profile", details: profileError.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const role = profile.role
    const institution = profile.institution

    // Base query - Administrator can see all, others see only their institution
    let query = supabase
      .from("submissions")
      .select("*")
      .order("updated_at", { ascending: false })

    // Administrator can see all submissions across all institutions
    if (role !== "administrator") {
      query = query.eq("institution", institution)
    }

    // Additional role-based filtering
    if (role === "instructor" || role === "senior_instructor") {
      query = query.eq("instructor_id", user.id)
    } else if (!["pc", "amo", "administrator", "institution_manager", "records"].includes(role)) {
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
      { 
        error: error instanceof Error ? error.message : "Failed to fetch submissions",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

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
    console.log("Received submission request body:", body)
    
    const { skill_area, skill_code, cohort, test_date, description, cluster, institution } = body

    // Get profile info including institution
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name, institution, role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json(
        { error: "User profile not found. Please contact administrator.", details: profileError?.message },
        { status: 400 }
      )
    }

    console.log("User profile:", { institution: profile.institution, role: profile.role })

    // Use institution from profile if not provided in request
    const submissionInstitution = institution || profile.institution

    if (!submissionInstitution) {
      return NextResponse.json(
        { error: "Institution is required but not found in profile or request" },
        { status: 400 }
      )
    }

    // Verify user's institution matches submission institution (unless Administrator)
    if (profile.role !== "administrator" && profile.institution !== submissionInstitution) {
      return NextResponse.json(
        { error: "You can only create submissions for your assigned institution" },
        { status: 403 }
      )
    }

    // Generate submission ID
    const now = new Date()
    const submissionId = `RFA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 10000)).padStart(5, "0")}`

    console.log("Creating submission with data:", {
      submission_id: submissionId,
      title: `${skill_area} - ${cohort}`,
      skill_area,
      skill_code,
      cluster,
      cohort,
      test_date,
      institution: submissionInstitution,
      instructor_id: user.id,
    })

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
        institution: submissionInstitution,
        description,
        status: "draft",
      })
      .select()

    if (error) {
      console.error("Submission insert error:", error)
      return NextResponse.json(
        { 
          error: "Failed to create submission", 
          details: error.message,
          hint: error.hint,
          code: error.code 
        },
        { status: 500 }
      )
    }

    console.log("Submission created successfully:", data[0])
    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    console.error("POST /api/submissions error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to create submission", 
        details: error?.details || error?.message,
        stack: error?.stack 
      },
      { status: 500 },
    )
  }
}