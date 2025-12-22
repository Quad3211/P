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

    // Check if user is Head of Programs or Institution Manager
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, institution")
      .eq("id", user.id)
      .single()

    if (!profile || !['head_of_programs', 'institution_manager'].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only Head of Programs and Institution Managers can remove users" },
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

    // Institution Manager can only remove users from their own institution
    if (profile.role === "institution_manager") {
      if (targetUser.institution !== profile.institution) {
        return NextResponse.json(
          { error: "You can only remove users from your own institution" },
          { status: 403 }
        )
      }
      
      // Institution Manager cannot remove Head of Programs
      if (targetUser.role === "head_of_programs") {
        return NextResponse.json(
          { error: "Institution Managers cannot remove Head of Programs accounts" },
          { status: 403 }
        )
      }
    }

    // Nobody can remove themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the system" },
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

    // ✅ Use the database function to delete from BOTH tables
    const { error: deleteError } = await supabase.rpc('delete_user_completely', {
      user_id: userId
    })

    if (deleteError) {
      console.error("Delete error:", deleteError)
      throw deleteError
    }

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