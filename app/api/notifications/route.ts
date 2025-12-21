// app/api/notifications/route.ts - UPDATED VERSION
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

interface Review {
  id: string
  submission_id: string
  reviewer_role: string
  created_at: string
}

interface ReviewSubmission {
  id: string
  submission_id: string
  title: string
}

interface ReviewWithSubmission extends Review {
  submission: ReviewSubmission | null
}

interface Submission {
  id: string
  submission_id: string
  title: string
  status: string
  updated_at: string
  instructor_name: string
  created_at: string
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

    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // ✅ First, fetch existing notifications from database
    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // Get submissions relevant to user based on their role
    let submissionsQuery = supabase
      .from("submissions")
      .select("id, submission_id, title, status, updated_at, instructor_name, created_at")
      .order("updated_at", { ascending: false })

    if (profile.role === 'instructor') {
      submissionsQuery = submissionsQuery.eq('instructor_id', user.id)
    } else if (profile.role === 'pc') {
      submissionsQuery = submissionsQuery.in('status', ['submitted', 'pc_review'])
    } else if (profile.role === 'amo') {
      submissionsQuery = submissionsQuery.in('status', ['amo_review'])
    }

    const { data: submissions, error: submissionsError } = await submissionsQuery

    if (submissionsError) {
      console.error("Submissions fetch error:", submissionsError)
    }

    // Get pending reviews for user
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("id, submission_id, reviewer_role, created_at")
      .eq("reviewer_id", user.id)
      .eq("status", "pending")

    if (reviewsError) {
      console.error("Reviews fetch error:", reviewsError)
    }

    const reviewsWithSubmissions: ReviewWithSubmission[] = []
    if (reviews && reviews.length > 0) {
      const submissionIds = reviews.map(r => r.submission_id)
      const { data: reviewSubmissions } = await supabase
        .from("submissions")
        .select("id, submission_id, title")
        .in("id", submissionIds)

      reviews.forEach(review => {
        const submission = reviewSubmissions?.find(s => s.id === review.submission_id)
        reviewsWithSubmissions.push({
          ...review,
          submission: submission || null
        })
      })
    }

    // Get role change notifications
    const { data: roleChanges } = await supabase
      .from("audit_logs")
      .select("id, action, created_at, details")
      .eq("action_type", "role_change")
      .order("created_at", { ascending: false })
      .limit(50)

    const userRoleChanges = (roleChanges || []).filter(rc => {
      try {
        const details = typeof rc.details === 'string' ? JSON.parse(rc.details) : rc.details
        return details?.target_user_id === user.id
      } catch {
        return false
      }
    }).slice(0, 5)

    // Build notifications with persistent read status
    const existingNotifMap = new Map(
      (existingNotifications || []).map(n => [n.id, n.read])
    )

    const notifications = [
      ...((submissions || []) as Submission[]).filter(s => 
        s.status !== 'draft' && 
        new Date(s.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).map((s) => {
        const notifId = `sub-${s.id}`
        return {
          id: notifId,
          type: "submission" as const,
          title: `${s.title} - ${s.status.replace(/_/g, ' ').toUpperCase()}`,
          message: `Submission has been ${s.status.replace(/_/g, " ")}`,
          timestamp: s.updated_at,
          read: existingNotifMap.get(notifId) || false,
          submission_id: s.submission_id,
        }
      }),
      
      ...reviewsWithSubmissions.map((r) => {
        const notifId = `rev-${r.id}`
        return {
          id: notifId,
          type: "review" as const,
          title: `Review Required`,
          message: `${r.submission?.title || 'A submission'} is pending your ${r.reviewer_role.toUpperCase()} review`,
          timestamp: r.created_at,
          read: existingNotifMap.get(notifId) || false,
          submission_id: r.submission?.submission_id,
        }
      }),
      
      ...userRoleChanges.map((rc) => {
        const notifId = `role-${rc.id}`
        return {
          id: notifId,
          type: "role_change" as const,
          title: `Your Role Has Been Updated`,
          message: rc.action,
          timestamp: rc.created_at,
          read: existingNotifMap.get(notifId) || false,
        }
      }),
    ]

    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(notifications.slice(0, 20))
  } catch (error) {
    console.error("Notifications error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notifications" },
      { status: 500 },
    )
  }
}

// ✅ NEW: Add PATCH endpoint to update notification read status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, read } = body

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: "notificationIds must be an array" },
        { status: 400 }
      )
    }

    // Upsert notifications with read status
    const notifications = notificationIds.map(id => ({
      id,
      user_id: user.id,
      type: 'system', // placeholder
      title: 'Notification',
      message: 'Notification',
      read: read !== false, // default to true if not specified
    }))

    const { error } = await supabase
      .from("notifications")
      .upsert(notifications, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })

    if (error) {
      console.error("Error updating notifications:", error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH Notifications error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update notifications" },
      { status: 500 },
    )
  }
}