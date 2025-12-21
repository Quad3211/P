// app/api/users/approve/route.ts
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

    // Check if user is Administrator
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "administrator") {
      return NextResponse.json(
        { error: "Only Administrator can approve users" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, action, reason } = body // action: 'approve' or 'reject'

    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing userId or action" },
        { status: 400 }
      )
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      )
    }

    // Get target user info
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("full_name, email, institution")
      .eq("id", userId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (action === "approve") {
      // Approve the user
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          approval_status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (updateError) throw updateError

      // Create audit log
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: `Approved user signup: ${targetUser.full_name}`,
        action_type: "user_approved",
        details: {
          approved_user_id: userId,
          approved_user_name: targetUser.full_name,
          approved_user_email: targetUser.email,
          institution: targetUser.institution,
          approver_id: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Successfully approved ${targetUser.full_name}`,
      })
    } else if (action === "reject") {
      // Reject the user
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          approval_status: "rejected",
          rejected_reason: reason,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (updateError) throw updateError

      // Create audit log
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: `Rejected user signup: ${targetUser.full_name}`,
        action_type: "user_rejected",
        details: {
          rejected_user_id: userId,
          rejected_user_name: targetUser.full_name,
          rejected_user_email: targetUser.email,
          institution: targetUser.institution,
          reason: reason,
          approver_id: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Successfully rejected ${targetUser.full_name}`,
      })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Approval error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process approval" },
      { status: 500 }
    )
  }
}