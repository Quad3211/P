import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("submissions")
      .select(`
        *,
        submission_documents(*),
        reviews(*)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Submission fetch error:", error)
      throw error
    }
    
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/submissions/[id] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch submission" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      skill_code,
      skill_area,
      cluster,
      cohort,
      test_date,
      description,
      status,
    } = body

    // Build update object dynamically
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (skill_area !== undefined) updateData.skill_area = skill_area
    if (skill_code !== undefined) updateData.skill_code = skill_code
    if (cluster !== undefined) updateData.cluster = cluster
    if (cohort !== undefined) updateData.cohort = cohort
    if (test_date !== undefined) updateData.test_date = test_date
    if (description !== undefined) updateData.description = description
    if (status !== undefined) {
      updateData.status = status
      if (status === "submitted") {
        updateData.submitted_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from("submissions")
      .update(updateData)
      .eq("id", id)
      .select()

    if (error) {
      console.error("Submission update error:", error)
      throw error
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("PATCH /api/submissions/[id] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update submission" },
      { status: 500 },
    )
  }
}