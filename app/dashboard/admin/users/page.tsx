// app/dashboard/admin/users/page.tsx
// UPDATED VERSION - Added Registration role for Administrator

"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

// UI Components
const Button = ({ children, onClick, disabled, variant = "default", size = "default", className = "" }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded font-medium transition-colors ${
      variant === "outline" 
        ? "border border-gray-300 hover:bg-gray-50" 
        : variant === "ghost"
        ? "hover:bg-gray-100"
        : "bg-cyan-500 text-white hover:bg-cyan-600"
    } ${size === "sm" ? "text-sm px-3 py-1" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
  >
    {children}
  </button>
)

const Card = ({ children, className = "" }: any) => <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
const CardHeader = ({ children, className = "" }: any) => <div className={`p-6 border-b ${className}`}>{children}</div>
const CardTitle = ({ children, className = "" }: any) => <h3 className={`text-xl font-bold ${className}`}>{children}</h3>
const CardContent = ({ children, className = "" }: any) => <div className={`p-6 ${className}`}>{children}</div>
const Badge = ({ children, className = "" }: any) => <span className={`px-2 py-1 text-xs font-semibold rounded ${className}`}>{children}</span>
const Input = ({ value, onChange, placeholder, className = "" }: any) => (
  <input type="text" value={value} onChange={onChange} placeholder={placeholder} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${className}`} />
)
const Label = ({ children, htmlFor }: any) => <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
const Alert = ({ children, className = "" }: any) => <div className={`rounded-lg p-4 border ${className}`}>{children}</div>
const Textarea = ({ value, onChange, placeholder, rows = 3, className = "" }: any) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${className}`} />
)

// ✅ UPDATED: Added registration role
const ROLE_INFO: Record<string, any> = {
  instructor: { label: "Instructor", description: "Submit and track submissions", color: "bg-blue-100 text-blue-800" },
  senior_instructor: { label: "Senior Instructor", description: "Secondary approval for PC reviews", color: "bg-purple-100 text-purple-800" },
  pc: { label: "PC Reviewer", description: "Primary reviewer - first level", color: "bg-yellow-100 text-yellow-800" },
  amo: { label: "AMO Reviewer", description: "Primary reviewer - final approval", color: "bg-orange-100 text-orange-800" },
  institution_manager: { label: "Institution Manager", description: "Manages users within institution", color: "bg-cyan-100 text-cyan-800" },
  registration: { label: "Registration Officer", description: "View-only access to users and submissions", color: "bg-pink-100 text-pink-800" },
  records: { label: "Records Manager", description: "Archive and manage records", color: "bg-green-100 text-green-800" },
  administrator: { label: "Administrator", description: "System administrator - all institutions", color: "bg-red-100 text-red-800" }
}

const INSTITUTION_COLORS: Record<string, string> = {
  "Boys Town": "bg-blue-100 text-blue-800",
  "Stony Hill": "bg-green-100 text-green-800",
  "Leap": "bg-purple-100 text-purple-800"
}

interface User {
  id: string
  email: string
  full_name: string
  role: string
  institution: string
  approval_status: string
  created_at: string
  rejected_reason?: string
}

export default function AdministratorUserManagement() {
  const supabase = createClient()
  
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterInstitution, setFilterInstitution] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [modalType, setModalType] = useState<string | null>(null)
  const [newRole, setNewRole] = useState("instructor")
  const [rejectReason, setRejectReason] = useState("")
  const [removeReason, setRemoveReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch users from API
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!supabase) {
        setError("Database connection not available")
        return
      }

      // Fetch all users - Administrator can see all
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, institution, approval_status, created_at, rejected_reason")
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError

      setUsers(data || [])
    } catch (err: any) {
      console.error("Error fetching users:", err)
      setError(err.message || "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  // Filter users
  useEffect(() => {
    let filtered = users
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (filterInstitution) filtered = filtered.filter(u => u.institution === filterInstitution)
    if (filterStatus) filtered = filtered.filter(u => u.approval_status === filterStatus)
    setFilteredUsers(filtered)
  }, [searchQuery, filterInstitution, filterStatus, users])

  const pendingCount = users.filter(u => u.approval_status === "pending").length
  const approvedCount = users.filter(u => u.approval_status === "approved").length
  const rejectedCount = users.filter(u => u.approval_status === "rejected").length
  const institutions = [...new Set(users.map(u => u.institution))]

  const handleApprove = async (userId: string) => {
    try {
      const response = await fetch("/api/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "approve" })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to approve user")
      }

      await fetchUsers()
      setModalType(null)
      setSelectedUser(null)
    } catch (err: any) {
      alert(err.message || "Failed to approve user")
    }
  }

  const handleReject = async (userId: string) => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection")
      return
    }

    try {
      const response = await fetch("/api/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "reject", reason: rejectReason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reject user")
      }

      await fetchUsers()
      setModalType(null)
      setSelectedUser(null)
      setRejectReason("")
    } catch (err: any) {
      alert(err.message || "Failed to reject user")
    }
  }

  const handleUpdateRole = async (userId: string) => {
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update role")
      }

      await fetchUsers()
      setModalType(null)
      setSelectedUser(null)
    } catch (err: any) {
      alert(err.message || "Failed to update role")
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!removeReason.trim()) {
      alert("Please provide a reason for removal")
      return
    }

    try {
      const response = await fetch("/api/users/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason: removeReason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to remove user")
      }

      await fetchUsers()
      setModalType(null)
      setSelectedUser(null)
      setRemoveReason("")
    } catch (err: any) {
      alert(err.message || "Failed to remove user")
    }
  }

  const openModal = (type: string, user: User) => {
    setSelectedUser(user)
    setModalType(type)
    if (type === 'role') setNewRole(user.role)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md bg-red-50 border-red-200">
          <p className="text-red-900 font-semibold">Error loading users</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <Button onClick={fetchUsers} variant="outline" className="mt-4">
            Retry
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">👥</span>
            <h1 className="text-4xl font-bold text-gray-900">User Management</h1>
          </div>
          <p className="text-gray-600">Administrator - Manage all users across all institutions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold text-gray-900">{users.length}</div></CardContent></Card>
          <Card className="border-2 border-amber-200"><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-amber-600">Pending Approval</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold text-amber-600">{pendingCount}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold text-green-600">{approvedCount}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-red-600">Rejected</CardTitle></CardHeader><CardContent><div className="text-4xl font-bold text-red-600">{rejectedCount}</div></CardContent></Card>
        </div>

        {pendingCount > 0 && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <div>You have <strong>{pendingCount}</strong> user registration{pendingCount !== 1 ? "s" : ""} awaiting your approval.</div>
            </div>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader><CardTitle>Search & Filter</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <Input id="search" placeholder="Search by name or email..." value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="institution">Institution</Label>
                <select id="institution" value={filterInstitution} onChange={(e) => setFilterInstitution(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                  <option value="">All Institutions</option>
                  {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select id="status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            {(searchQuery || filterInstitution || filterStatus) && (
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setFilterInstitution(""); setFilterStatus("") }}>Clear Filters</Button>
                <span className="text-sm text-gray-600">Showing {filteredUsers.length} of {users.length} users</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
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
                  {filteredUsers.map(user => {
                    const roleInfo = ROLE_INFO[user.role]
                    return (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{user.full_name}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3"><Badge className={INSTITUTION_COLORS[user.institution]}>{user.institution}</Badge></td>
                        <td className="px-4 py-3"><Badge className={roleInfo?.color || "bg-gray-100"}>{roleInfo?.label || user.role}</Badge></td>
                        <td className="px-4 py-3">
                          <Badge className={
                            user.approval_status === "approved" ? "bg-green-100 text-green-800" : 
                            user.approval_status === "pending" ? "bg-amber-100 text-amber-800" : 
                            "bg-red-100 text-red-800"
                          }>
                            {user.approval_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {user.approval_status === "pending" && (
                              <Button size="sm" variant="outline" onClick={() => openModal('approval', user)}>Review</Button>
                            )}
                            {user.approval_status === "approved" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => openModal('role', user)}>Change Role</Button>
                                <Button size="sm" variant="outline" onClick={() => openModal('remove', user)} className="text-red-600">🚫</Button>
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
          </CardContent>
        </Card>

        {modalType && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              {modalType === 'approval' && (
                <>
                  <h3 className="text-xl font-bold mb-4">Review User Registration</h3>
                  <div className="space-y-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div><strong>Name:</strong> {selectedUser.full_name}</div>
                      <div><strong>Email:</strong> {selectedUser.email}</div>
                      <div><strong>Institution:</strong> <Badge className={INSTITUTION_COLORS[selectedUser.institution]}>{selectedUser.institution}</Badge></div>
                      <div><strong>Registered:</strong> {new Date(selectedUser.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <Label htmlFor="reject-reason">Rejection Reason (if rejecting)</Label>
                      <Textarea id="reject-reason" placeholder="Enter reason for rejection..." value={rejectReason} onChange={(e: any) => setRejectReason(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
                    <Button variant="outline" onClick={() => handleReject(selectedUser.id)} className="text-red-600">Reject</Button>
                    <Button onClick={() => handleApprove(selectedUser.id)}>✓ Approve</Button>
                  </div>
                </>
              )}

              {modalType === 'role' && (
                <>
                  <h3 className="text-xl font-bold mb-4">Change User Role</h3>
                  <div className="space-y-4 mb-6">
                    <p className="text-gray-600">Update role for {selectedUser.full_name}</p>
                    <div>
                      <Label htmlFor="role">Select New Role</Label>
                      <select id="role" value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                        {Object.entries(ROLE_INFO).map(([role, info]) => (
                          <option key={role} value={role}>{info.label} - {info.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
                    <Button onClick={() => handleUpdateRole(selectedUser.id)}>Update Role</Button>
                  </div>
                </>
              )}

              {modalType === 'remove' && (
                <>
                  <h3 className="text-xl font-bold mb-4">Remove User</h3>
                  <Alert className="bg-red-50 border-red-200 mb-4">
                    <div className="flex items-start gap-2">
                      <span>⚠️</span>
                      <div className="text-sm">You are about to remove <strong>{selectedUser.full_name}</strong> ({selectedUser.email}) from the system. This action cannot be undone.</div>
                    </div>
                  </Alert>
                  <div className="mb-6">
                    <Label htmlFor="remove-reason">Reason for Removal <span className="text-red-500">*</span></Label>
                    <Textarea id="remove-reason" placeholder="Enter reason for removal..." value={removeReason} onChange={(e: any) => setRemoveReason(e.target.value)} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
                    <Button onClick={() => handleRemoveUser(selectedUser.id)} className="bg-red-600 hover:bg-red-700 text-white">Remove User</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}