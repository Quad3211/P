// app/api/users/route.ts
// Updated with Institution Manager restrictions

import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    if (!user) {
      console.error("[users/GET] No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[users/GET] Authenticated user ID:", user.id)

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, institution, full_name")
      .eq("id", user.id)
      .single()

    console.log("[users/GET] Current user profile:", profile)
    
    if (profileError) {
      console.error("[users/GET] Profile fetch error:", profileError)
      return NextResponse.json(
        { 
          error: "Failed to fetch profile", 
          details: profileError.message,
          code: profileError.code 
        },
        { status: 500 }
      )
    }

    if (!profile) {
      console.error("[users/GET] Profile not found for user:", user.id)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (!["head_of_programs", "institution_manager"].includes(profile.role)) {
      console.log("[users/GET] Insufficient permissions. Role:", profile.role)
      return NextResponse.json(
        { error: `Only Institution Manager and Head of Programs users can view all users. Your role: ${profile.role}` },
        { status: 403 }
      )
    }

    console.log(`[users/GET] Fetching users for ${profile.role} from ${profile.institution}`)

    const { data, error, count } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, institution, approval_status, created_at", { count: 'exact' })
      .order("full_name", { ascending: true })

    console.log("[users/GET] Query completed. Count:", count, "Data length:", data?.length || 0)
    
    if (error) {
      console.error("[users/GET] Query error:", error)
      return NextResponse.json(
        { 
          error: "Failed to fetch users",
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 500 }
      )
    }

    if (data && data.length === 0) {
      console.warn("[users/GET] No users returned. This might be an RLS policy issue.")
      console.warn("[users/GET] User role:", profile.role)
      console.warn("[users/GET] User institution:", profile.institution)
    }

    return NextResponse.json(data || [])
    
  } catch (error) {
    console.error("[users/GET] Unexpected error:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined
      },
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

    if (profileError) {
      console.error("Profile fetch error:", profileError)
      return NextResponse.json(
        { error: "Failed to fetch profile", details: profileError.message },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    if (!["head_of_programs", "institution_manager"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only Institution Manager and Head of Programs users can change roles" },
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
      "head_of_programs",
    ]

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // 🔒 CRITICAL: Institution Managers cannot assign Head of Programs role
    if (profile.role === "institution_manager" && role === "head_of_programs") {
      return NextResponse.json(
        { error: "Institution Managers cannot assign the Head of Programs role" },
        { status: 403 }
      )
    }

    // 🔒 CRITICAL: Institution Managers cannot promote themselves to Head of Programs
    if (profile.role === "institution_manager" && userId === user.id && role === "head_of_programs") {
      return NextResponse.json(
        { error: "You cannot promote yourself to Head of Programs" },
        { status: 403 }
      )
    }

    // Get target user info before update
    const { data: targetUser, error: targetError } = await supabase
      .from("profiles")
      .select("full_name, email, role, institution")
      .eq("id", userId)
      .single()

    if (targetError) {
      console.error("Target user fetch error:", targetError)
      return NextResponse.json(
        { error: "Target user not found", details: targetError.message },
        { status: 404 }
      )
    }

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Institution Managers can only update users from their own institution
    if (profile.role === "institution_manager" && targetUser.institution !== profile.institution) {
      return NextResponse.json(
        { error: "You can only modify users from your own institution" },
        { status: 403 }
      )
    }

    // Update the user's role
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()

    if (error) {
      console.error("Role update error:", error)
      throw error
    }

    // Create audit log entry
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
    console.error("Role update error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to update role",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}