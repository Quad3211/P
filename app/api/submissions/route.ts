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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let query = supabase.from("submissions").select("*").order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch submissions" },
      { status: 500 },
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
    const { title, skill_area, cohort, test_date, description } = body

    // Get profile info
    const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", user.id).single()

    // Generate submission ID
    const now = new Date()
    const submissionId = `RFA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 10000)).padStart(5, "0")}`

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        submission_id: submissionId,
        title,
        skill_area,
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create submission" },
      { status: 500 },
    )
  }
}
