// app/api/users/remove/route.ts
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

    // Check if user is Head of Programs
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "head_of_programs") {
      return NextResponse.json(
        { error: "Only Head of Programs can remove users" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, reason } = body

    if (!userId || !reason) {
      return NextResponse.json(
        { error: "Missing userId or reason" },
        { status: 400 }
      )
    }

    // Get target user info before deletion
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("full_name, email, role, institution")
      .eq("id", userId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent removing other Head of Programs (optional safety check)
    if (targetUser.role === "head_of_programs") {
      return NextResponse.json(
        { error: "Cannot remove Head of Programs accounts" },
        { status: 403 }
      )
    }

    // Create audit log BEFORE deletion
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: `Removed user from system: ${targetUser.full_name}`,
      action_type: "user_removed",
      details: {
        removed_user_id: userId,
        removed_user_name: targetUser.full_name,
        removed_user_email: targetUser.email,
        removed_user_role: targetUser.role,
        institution: targetUser.institution,
        reason: reason,
        remover_id: user.id,
      },
    })

    // Delete from profiles (this will cascade to auth.users if set up correctly)
    const { error: deleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId)

    if (deleteError) throw deleteError

    // Also need to delete from auth.users (requires admin privileges)
    // This would typically be done via a Supabase function or admin API
    // For now, we'll just delete the profile and let the admin handle auth cleanup

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${targetUser.full_name} from the system`,
    })
  } catch (error) {
    console.error("Remove user error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove user" },
      { status: 500 }
    )
  }
}