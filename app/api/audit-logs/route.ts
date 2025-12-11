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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    // Allow admin, records, and im to view audit logs
    if (!["admin", "records", "im"].includes(profile?.role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get("submission_id")
    const actionType = searchParams.get("action_type")
    const userId = searchParams.get("user_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const download = searchParams.get("download") === "true"

    let query = supabase
      .from("audit_logs")
      .select(`
        *,
        user:user_id(full_name, email, role),
        submission:submission_id(submission_id, title, instructor_name)
      `)
      .order("created_at", { ascending: false })

    if (submissionId) {
      query = query.eq("submission_id", submissionId)
    }
    if (actionType) {
      query = query.eq("action_type", actionType)
    }
    if (userId) {
      query = query.eq("user_id", userId)
    }
    if (startDate) {
      query = query.gte("created_at", startDate)
    }
    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    const { data, error } = await query

    if (error) throw error

    // If download is requested, return CSV
    if (download) {
      const csv = convertToCSV(data)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`,
        },
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch audit logs" },
      { status: 500 },
    )
  }
}

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return "No data available"

  const headers = ["Date/Time", "User", "Role", "Action", "Submission ID", "Submission Title", "Details"]
  const rows = data.map((log) => [
    new Date(log.created_at).toLocaleString(),
    log.user?.full_name || "System",
    log.user?.role || "N/A",
    log.action,
    log.submission?.submission_id || "N/A",
    log.submission?.title || "N/A",
    JSON.stringify(log.details || {}),
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n")

  return csvContent
}