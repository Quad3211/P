"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Search, CheckCircle, XCircle, UserX, Building2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  institution: string
  approval_status: string
  created_at: string
  approved_at?: string
  rejected_reason?: string
}

type UserRole = "instructor" | "senior_instructor" | "pc" | "amo" | "institution_manager" | "records" | "head_of_programs"

const ROLE_INFO: Record<UserRole, { label: string; description: string; color: string }> = {
  instructor: {
    label: "Instructor",
    description: "Submit and track submissions",
    color: "bg-blue-100 text-blue-800"
  },
  senior_instructor: {
    label: "Senior Instructor",
    description: "Secondary approval for PC reviews",
    color: "bg-purple-100 text-purple-800"
  },
  pc: {
    label: "PC Reviewer",
    description: "Primary reviewer - first level",
    color: "bg-yellow-100 text-yellow-800"
  },
  amo: {
    label: "AMO Reviewer",
    description: "Primary reviewer - final approval",
    color: "bg-orange-100 text-orange-800"
  },
  institution_manager: {
    label: "Institution Manager",
    description: "Manages users within institution",
    color: "bg-cyan-100 text-cyan-800"
  },
  records: {
    label: "Records Manager",
    description: "Archive and manage records",
    color: "bg-green-100 text-green-800"
  },
  head_of_programs: {
    label: "Head of Programs",
    description: "System administrator - all institutions",
    color: "bg-red-100 text-red-800"
  }
}

const INSTITUTION_COLORS: Record<string, string> = {
  "Boys Town": "bg-blue-100 text-blue-800",
  "Stony Hill": "bg-green-100 text-green-800",
  "Leap": "bg-purple-100 text-purple-800"
}

export default function AdminUserManagementPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterInstitution, setFilterInstitution] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<UserRole>("instructor")
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [removeReason, setRemoveReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (filterInstitution) {
      filtered = filtered.filter((user) => user.institution === filterInstitution)
    }

    if (filterStatus) {
      filtered = filtered.filter((user) => user.approval_status === filterStatus)
    }

    setFilteredUsers(filtered)
  }, [searchQuery, filterInstitution, filterStatus, users])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setUsers(data || [])
      setFilteredUsers(data || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    setActionLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Call approval function
      const { error } = await supabase.rpc('approve_user_signup', {
        user_id: userId,
        approver_id: user?.id
      })

      if (error) throw error

      await fetchUsers()
      setIsApprovalDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      console.error("Failed to approve user:", error)
      alert("Failed to approve user")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (userId: string) => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection")
      return
    }

    setActionLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.rpc('reject_user_signup', {
        user_id: userId,
        approver_id: user?.id,
        reason: rejectReason
      })

      if (error) throw error

      await fetchUsers()
      setIsApprovalDialogOpen(false)
      setSelectedUser(null)
      setRejectReason("")
    } catch (error) {
      console.error("Failed to reject user:", error)
      alert("Failed to reject user")
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedUser) return

    setActionLoading(true)
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: newRole,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update role")
      }

      await fetchUsers()
      setIsRoleDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      console.error("Failed to update role:", error)
      alert(`Failed to update role: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveUser = async () => {
    if (!selectedUser || !removeReason.trim()) {
      alert("Please provide a reason for removal")
      return
    }

    setActionLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.rpc('remove_user', {
        user_id: selectedUser.id,
        remover_id: user?.id,
        reason: removeReason
      })

      if (error) throw error

      await fetchUsers()
      setIsRemoveDialogOpen(false)
      setSelectedUser(null)
      setRemoveReason("")
    } catch (error) {
      console.error("Failed to remove user:", error)
      alert("Failed to remove user")
    } finally {
      setActionLoading(false)
    }
  }

  const pendingCount = users.filter(u => u.approval_status === "pending").length
  const approvedCount = users.filter(u => u.approval_status === "approved").length
  const rejectedCount = users.filter(u => u.approval_status === "rejected").length

  const institutions = [...new Set(users.map(u => u.institution))]

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-cyan-600" />
            <h1 className="text-4xl font-bold text-slate-900">User Management</h1>
          </div>
          <p className="text-slate-600">Head of Programs - Manage all users across all institutions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900">{users.length}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-600">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-amber-600">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-600">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals Alert */}
        {pendingCount > 0 && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              You have <strong>{pendingCount}</strong> user registration{pendingCount !== 1 ? "s" : ""} awaiting your approval.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="institution">Institution</Label>
                <select
                  id="institution"
                  value={filterInstitution}
                  onChange={(e) => setFilterInstitution(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Institutions</option>
                  {institutions.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {(searchQuery || filterInstitution || filterStatus) && (
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setFilterInstitution("")
                    setFilterStatus("")
                  }}
                >
                  Clear Filters
                </Button>
                <span className="text-sm text-slate-600">
                  Showing {filteredUsers.length} of {users.length} users
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Manage users across all institutions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-600">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Institution</th>
                      <th className="px-4 py-3 text-left font-semibold">Role</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const roleInfo = ROLE_INFO[user.role as UserRole]
                      return (
                        <tr key={user.id} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{user.full_name}</td>
                          <td className="px-4 py-3 text-slate-600">{user.email}</td>
                          <td className="px-4 py-3">
                            <Badge className={INSTITUTION_COLORS[user.institution]}>
                              {user.institution}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={roleInfo?.color || "bg-gray-100"}>
                              {roleInfo?.label || user.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                user.approval_status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : user.approval_status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {user.approval_status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {user.approval_status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setIsApprovalDialogOpen(true)
                                  }}
                                  className="text-xs"
                                >
                                  Review
                                </Button>
                              )}
                              {user.approval_status === "approved" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedUser(user)
                                      setNewRole(user.role as UserRole)
                                      setIsRoleDialogOpen(true)
                                    }}
                                    className="text-xs"
                                  >
                                    Change Role
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedUser(user)
                                      setIsRemoveDialogOpen(true)
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700"
                                  >
                                    <UserX className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Dialog */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review User Registration</DialogTitle>
              <DialogDescription>
                Approve or reject this user's registration
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div><strong>Name:</strong> {selectedUser.full_name}</div>
                  <div><strong>Email:</strong> {selectedUser.email}</div>
                  <div>
                    <strong>Institution:</strong> 
                    <Badge className={`ml-2 ${INSTITUTION_COLORS[selectedUser.institution]}`}>
                      {selectedUser.institution}
                    </Badge>
                  </div>
                  <div><strong>Registered:</strong> {new Date(selectedUser.created_at).toLocaleString()}</div>
                </div>

                <div>
                  <Label htmlFor="reject-reason">Rejection Reason (if rejecting)</Label>
                  <Input
                    id="reject-reason"
                    placeholder="Enter reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsApprovalDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedUser && handleReject(selectedUser.id)}
                disabled={actionLoading || !rejectReason.trim()}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => selectedUser && handleApprove(selectedUser.id)}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {actionLoading ? "Processing..." : "Approve"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Change Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update role for {selectedUser?.full_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="role">Select New Role</Label>
                <select
                  id="role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-md mt-2"
                >
                  {Object.entries(ROLE_INFO).map(([role, info]) => (
                    <option key={role} value={role}>
                      {info.label} - {info.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={actionLoading || newRole === selectedUser?.role}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                {actionLoading ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove User Dialog */}
        <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove User</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The user will be permanently removed from the system.
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4">
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    You are about to remove <strong>{selectedUser.full_name}</strong> ({selectedUser.email}) from the system.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="remove-reason">Reason for Removal <span className="text-red-500">*</span></Label>
                  <Input
                    id="remove-reason"
                    placeholder="Enter reason for removal..."
                    value={removeReason}
                    onChange={(e) => setRemoveReason(e.target.value)}
                    className="mt-2"
                    required
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRemoveUser}
                disabled={actionLoading || !removeReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? "Removing..." : "Remove User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}