// app/api/users/route.ts
import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view all users
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "im"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only IM and Admin users can view all users" },
        { status: 403 }
      );
    }

    // Fetch all users
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("full_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is IM or admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "im"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only IM and Admin users can change roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing userId or role" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = [
      "instructor",
      "senior_instructor",
      "pc",
      "amo",
      "im",
      "registration",
      "records",
      "admin",
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Get target user info before update
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the user's role
    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select();

    if (error) throw error;

    // Create audit log entry (will be handled by trigger, but we can add manual entry too)
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
      },
    });

    return NextResponse.json({
      success: true,
      user: data[0],
      message: `Successfully updated ${targetUser.full_name} to ${role}`,
    });
  } catch (error) {
    console.error("Role update error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update role",
      },
      { status: 500 }
    );
  }
}
