// lib/audit.ts
// Centralized audit logging system

import { createClient } from "@/lib/supabase/server"

export type AuditAction = 
  | "user_signup"
  | "user_approved"
  | "user_rejected"
  | "user_removed"
  | "role_change"
  | "submission_created"
  | "submission_updated"
  | "submission_submitted"
  | "document_uploaded"
  | "review_created"
  | "review_approved"
  | "review_rejected"
  | "submission_archived"
  | "settings_updated"
  | "user_login"
  | "user_logout"

interface AuditLogParams {
  userId: string
  action: string
  actionType: AuditAction
  submissionId?: string
  targetUserId?: string
  details?: Record<string, any>
  ipAddress?: string
}

/**
 * Creates an audit log entry in the database
 * This should be called after every significant system action
 */
export async function createAuditLog({
  userId,
  action,
  actionType,
  submissionId,
  targetUserId,
  details = {},
  ipAddress,
}: AuditLogParams) {
  try {
    const supabase = await createClient()

    const logEntry = {
      user_id: userId,
      action,
      action_type: actionType,
      submission_id: submissionId || null,
      target_user_id: targetUserId || null,
      details: JSON.stringify(details),
      ip_address: ipAddress || null,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("audit_logs")
      .insert(logEntry)

    if (error) {
      console.error("Failed to create audit log:", error)
      // Don't throw - audit log failures shouldn't break the main operation
    }
  } catch (error) {
    console.error("Audit log error:", error)
  }
}

/**
 * Helper to get current user ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}

/**
 * Helper to get user details for audit logs
 */
export async function getUserDetails(userId: string) {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, role, institution")
      .eq("id", userId)
      .single()
    
    return data
  } catch {
    return null
  }
}

/**
 * Format audit log for display
 */
export function formatAuditLog(log: any) {
  return {
    id: log.id,
    timestamp: new Date(log.created_at).toLocaleString(),
    action: log.action,
    actionType: log.action_type,
    details: typeof log.details === 'string' 
      ? JSON.parse(log.details) 
      : log.details,
  }
}