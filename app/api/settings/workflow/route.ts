import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Workflow settings are stored in a separate simple table
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!["administrator", "records", "institution_manager"].includes(profile?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Return default settings for now - in production, store in DB
    const settings = {
      review_timeouts_days: 14,
      escalation_email: "admin-escalations@school.edu",
      default_primary_contact: null,
      file_retention_years: 5,
    }

    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch settings" },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "administrator") {
      return NextResponse.json({ error: "Only Administrator can update settings" }, { status: 403 })
    }

    const body = await request.json()
    // In production, save these to a settings table
    return NextResponse.json({ success: true, settings: body })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 },
    )
  }
}