// app/api/users/route.ts
// REPLACE THE ENTIRE FILE WITH THIS

import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, institution, full_name")
      .eq("id", user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // ✅ Allow registration role to view all users (read-only)
    if (!["administrator", "institution_manager", "registration"].includes(profile.role)) {
      return NextResponse.json(
        { error: `Only Institution Manager, Registration, and Administrator users can view all users. Your role: ${profile.role}` },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, institution, approval_status, created_at")
      .order("full_name", { ascending: true })
    
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch users", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
    
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, institution")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // ✅ Registration role is view-only, cannot modify users
    if (profile.role === "registration") {
      return NextResponse.json(
        { error: "Registration role has view-only access and cannot modify users" },
        { status: 403 }
      )
    }

    if (!["administrator", "institution_manager"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only Institution Manager and Administrator users can change roles" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing userId or role" },
        { status: 400 }
      )
    }

    // Validate role - ✅ Added registration
    const validRoles = [
      "instructor",
      "senior_instructor",
      "pc",
      "amo",
      "institution_manager",
      "registration",
      "records",
      "administrator",
    ]

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (profile.role === "institution_manager" && role === "administrator") {
      return NextResponse.json(
        { error: "Institution Managers cannot assign the Administrator role" },
        { status: 403 }
      )
    }

    const { data: targetUser } = await supabase
      .from("profiles")
      .select("full_name, email, role, institution")
      .eq("id", userId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (profile.role === "institution_manager" && targetUser.institution !== profile.institution) {
      return NextResponse.json(
        { error: "You can only modify users from your own institution" },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()

    if (error) throw error

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: `Changed ${targetUser.full_name}'s role from ${targetUser.role} to ${role}`,
      action_type: "role_change",
      details: {
        target_user_id: userId,
        target_user_name: targetUser.full_name,
        target_user_email: targetUser.email,
        old_role: targetUser.role,
        new_role: role,
        changed_by_id: user.id,
        changed_by_role: profile.role,
      },
    })

    return NextResponse.json({
      success: true,
      user: data[0],
      message: `Successfully updated ${targetUser.full_name} to ${role}`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    )
  }
}