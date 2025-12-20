import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Define types for better type safety
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

    if (profileError) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json({ error: "Profile not found", details: profileError.message }, { status: 404 })
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get submissions relevant to user based on their role
    let submissionsQuery = supabase
      .from("submissions")
      .select("id, submission_id, title, status, updated_at, instructor_name, created_at")
      .order("updated_at", { ascending: false })

    // Filter based on role
    if (profile.role === 'instructor') {
      submissionsQuery = submissionsQuery.eq('instructor_id', user.id)
    } else if (profile.role === 'pc') {
      submissionsQuery = submissionsQuery.in('status', ['submitted', 'pc_review'])
    } else if (profile.role === 'amo') {
      submissionsQuery = submissionsQuery.in('status', ['amo_review'])
    }
    // Admin, IM, records see all

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

    // Get submission details for reviews
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

    // Filter role changes for current user
    const userRoleChanges = (roleChanges || []).filter(rc => {
      try {
        const details = typeof rc.details === 'string' ? JSON.parse(rc.details) : rc.details
        return details?.target_user_id === user.id
      } catch {
        return false
      }
    }).slice(0, 5)

    const notifications = [
      // Submission status updates
      ...((submissions || []) as Submission[]).filter(s => 
        s.status !== 'draft' && 
        new Date(s.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).map((s) => ({
        id: `sub-${s.id}`,
        type: "submission" as const,
        title: `${s.title} - ${s.status.replace(/_/g, ' ').toUpperCase()}`,
        message: `Submission has been ${s.status.replace(/_/g, " ")}`,
        timestamp: s.updated_at,
        read: false,
        submission_id: s.submission_id,
      })),
      
      // Pending reviews
      ...reviewsWithSubmissions.map((r) => ({
        id: `rev-${r.id}`,
        type: "review" as const,
        title: `Review Required`,
        message: `${r.submission?.title || 'A submission'} is pending your ${r.reviewer_role.toUpperCase()} review`,
        timestamp: r.created_at,
        read: false,
        submission_id: r.submission?.submission_id,
      })),
      
      // Role change notifications
      ...userRoleChanges.map((rc) => ({
        id: `role-${rc.id}`,
        type: "role_change" as const,
        title: `Your Role Has Been Updated`,
        message: rc.action,
        timestamp: rc.created_at,
        read: false,
      })),
    ]

    // Sort by timestamp and limit to 20
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json(notifications.slice(0, 20))
  } catch (error) {
    console.error("Notifications error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notifications", details: error instanceof Error ? error.stack : undefined },
      { status: 500 },
    )
  }
}