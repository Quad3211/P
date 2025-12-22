// app/api/users/route.ts
// COMPLETE FIXED VERSION

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, institution, full_name")
      .eq("id", user.id)
      .single()
    
    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    console.log("User role from database:", profile.role) // Debug log

    // ✅ FIXED: Check for all three allowed roles
    const allowedRoles = ["administrator", "institution_manager", "registration"]
    
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { 
          error: `Unauthorized - Institution Manager, Registration, or Administrator access only`,
          yourRole: profile.role,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      )
    }

    // Fetch all users
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, institution, approval_status, created_at")
      .order("full_name", { ascending: true })
    
    if (error) {
      console.error("Users fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch users", message: error.message },
        { status: 500 }
      )
    }

    console.log(`Successfully fetched ${data?.length || 0} users for ${profile.role}`)
    return NextResponse.json(data || [])
    
  } catch (error) {
    console.error("GET /api/users error:", error)
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, institution")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // ✅ Registration role is view-only
    if (profile.role === "registration") {
      return NextResponse.json(
        { error: "Registration role has view-only access and cannot modify users" },
        { status: 403 }
      )
    }

    // ✅ Only administrator and institution_manager can modify
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

    // Validate role
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

    // Institution Manager cannot assign administrator role
    if (profile.role === "institution_manager" && role === "administrator") {
      return NextResponse.json(
        { error: "Institution Managers cannot assign the Administrator role" },
        { status: 403 }
      )
    }

    // Get target user
    const { data: targetUser, error: targetError } = await supabase
      .from("profiles")
      .select("full_name, email, role, institution")
      .eq("id", userId)
      .single()

    if (targetError || !targetUser) {
      console.error("Target user fetch error:", targetError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Institution Manager can only modify users from same institution
    if (profile.role === "institution_manager" && targetUser.institution !== profile.institution) {
      return NextResponse.json(
        { error: "You can only modify users from your own institution" },
        { status: 403 }
      )
    }

    // Update role
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()

    if (error) {
      console.error("Update role error:", error)
      throw error
    }

    // Create audit log
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

    console.log(`Role changed: ${targetUser.full_name} from ${targetUser.role} to ${role}`)

    return NextResponse.json({
      success: true,
      user: data[0],
      message: `Successfully updated ${targetUser.full_name} to ${role}`,
    })
  } catch (error) {
    console.error("PATCH /api/users error:", error)
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    )
  }
}