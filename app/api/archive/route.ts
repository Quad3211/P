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

    // Check if user is records manager
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "records" && profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized to archive" }, { status: 403 })
    }

    const body = await request.json()
    const { submission_id, file_format, retention_until, archive_notes } = body

    const { data, error } = await supabase
      .from("archived_submissions")
      .insert({
        submission_id,
        file_format,
        retention_until,
        archive_notes,
        archived_by: user.id,
      })
      .select()

    if (error) throw error

    // Update submission status
    await supabase.from("submissions").update({ status: "archived" }).eq("id", submission_id)

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to archive" }, { status: 500 })
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

    const { data, error } = await supabase
      .from("archived_submissions")
      .select(`*`)
      .order("archived_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch archives" },
      { status: 500 },
    )
  }
}
