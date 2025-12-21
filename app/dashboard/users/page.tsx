"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

// Type definitions
interface User {
  id: string
  email: string
  full_name: string
  role: string
  institution: string
  created_at: string
}

type ButtonProps = {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm"
  className?: string
}

type CardProps = { children: React.ReactNode; className?: string }
type LabelProps = { children: React.ReactNode; htmlFor?: string }
type InputProps = { 
  id?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
}
type AlertProps = { children: React.ReactNode; className?: string }
type TextareaProps = { 
  id?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  className?: string
}

// UI Components
const Button = ({ children, onClick, disabled, variant = "default", size = "default", className = "" }: ButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded font-medium transition-colors ${
      variant === "outline" 
        ? "border border-gray-300 hover:bg-gray-50" 
        : variant === "ghost"
        ? "hover:bg-gray-100"
        : variant === "destructive"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-cyan-500 text-white hover:bg-cyan-600"
    } ${size === "sm" ? "text-sm px-3 py-1" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
  >
    {children}
  </button>
)

const Card = ({ children, className = "" }: CardProps) => <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
const CardHeader = ({ children, className = "" }: CardProps) => <div className={`p-6 border-b ${className}`}>{children}</div>
const CardTitle = ({ children, className = "" }: CardProps) => <h3 className={`text-xl font-bold ${className}`}>{children}</h3>
const CardContent = ({ children, className = "" }: CardProps) => <div className={`p-6 ${className}`}>{children}</div>
const Badge = ({ children, className = "" }: CardProps) => <span className={`px-2 py-1 text-xs font-semibold rounded ${className}`}>{children}</span>
const Input = ({ id, value, onChange, placeholder, className = "" }: InputProps) => (
  <input id={id} type="text" value={value} onChange={onChange} placeholder={placeholder} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${className}`} />
)
const Label = ({ children, htmlFor }: LabelProps) => <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
const Alert = ({ children, className = "" }: AlertProps) => <div className={`rounded-lg p-4 border ${className}`}>{children}</div>
const Textarea = ({ id, value, onChange, placeholder, rows = 3, className = "" }: TextareaProps) => (
  <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} rows={rows} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${className}`} />
)

const ROLE_INFO: Record<string, any> = {
  instructor: { label: "Instructor", description: "Submit and track submissions", color: "bg-blue-100 text-blue-800" },
  senior_instructor: { label: "Senior Instructor", description: "Secondary approval for PC reviews", color: "bg-purple-100 text-purple-800" },
  pc: { label: "PC Reviewer", description: "Primary reviewer - first level", color: "bg-yellow-100 text-yellow-800" },
  amo: { label: "AMO Reviewer", description: "Primary reviewer - final approval", color: "bg-orange-100 text-orange-800" },
  institution_manager: { label: "Institution Manager", description: "Manages users within institution", color: "bg-cyan-100 text-cyan-800" },
  records: { label: "Records Manager", description: "Archive and manage records", color: "bg-green-100 text-green-800" },
  head_of_programs: { label: "Head of Programs", description: "System administrator - all institutions", color: "bg-red-100 text-red-800" }
}

const INSTITUTION_COLORS: Record<string, string> = {
  "Boys Town": "bg-blue-100 text-blue-800",
  "Stony Hill": "bg-green-100 text-green-800",
  "Leap": "bg-purple-100 text-purple-800"
}

export default function UnifiedUserManagement() {
  const supabase = createClient()
  
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterInstitution, setFilterInstitution] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [modalType, setModalType] = useState<string | null>(null)
  const [newRole, setNewRole] = useState("instructor")
  const [removeReason, setRemoveReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState("")
  const [currentUserId, setCurrentUserId] = useState("")
  const [currentUserInstitution, setCurrentUserInstitution] = useState("")

  // Fetch current user info
  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      if (!supabase) {
        setError("Database connection not available")
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Not authenticated")
        return
      }

      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, institution")
        .eq("id", user.id)
        .single()

      if (!profile) {
        setError("Profile not found")
        return
      }

      if (!["institution_manager", "head_of_programs"].includes(profile.role)) {
        setError("Unauthorized - Institution Manager or Head of Programs access only")
        return
      }

      setCurrentUserRole(profile.role)
      setCurrentUserInstitution(profile.institution)
      await fetchUsers()
    } catch (err: unknown) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      if (!supabase) return

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, institution, created_at")
        .order("full_name", { ascending: true })

      if (fetchError) throw fetchError

      setUsers(data || [])
      setFilteredUsers(data || [])
    } catch (err: unknown) {
      console.error("Error fetching users:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch users")
    }
  }

  // Filter users
  useEffect(() => {
    let filtered = users

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (filterInstitution) filtered = filtered.filter((u) => u.institution === filterInstitution)
    setFilteredUsers(filtered)
  }, [searchQuery, filterInstitution, users])

  const institutions = [...new Set(users.map((u) => u.institution))]

  // Get available roles based on current user's role
  const getAvailableRoles = (targetUserId: string) => {
    const allRoles = Object.keys(ROLE_INFO)
    
    // Head of Programs can assign any role
    if (currentUserRole === "head_of_programs") {
      return allRoles
    }
    
    // Institution Managers cannot assign Head of Programs role
    if (currentUserRole === "institution_manager") {
      const restrictedRoles = allRoles.filter(role => {
        if (role === "head_of_programs") return false
        if (targetUserId === currentUserId && role === "head_of_programs") return false
        return true
      })
      return restrictedRoles
    }
    
    return allRoles
  }

  const handleUpdateRole = async (userId: string) => {
    try {
      if (currentUserRole === "institution_manager" && userId === currentUserId && newRole === "head_of_programs") {
        alert("Institution Managers cannot promote themselves to Head of Programs")
        return
      }

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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update role")
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!removeReason.trim()) {
      alert("Please provide a reason for removal")
      return
    }

    if (userId === currentUserId) {
      alert("You cannot remove yourself from the system")
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove user")
    }
  }

  const openModal = (type: string, user: User) => {
    setSelectedUser(user)
    setModalType(type)
    if (type === 'role') setNewRole(user.role)
  }

  const isHeadOfPrograms = currentUserRole === "head_of_programs"

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
          <Button onClick={fetchCurrentUser} variant="outline" className="mt-4">
            Retry
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">👥</span>
            <h1 className="text-4xl font-bold text-gray-900">User Management</h1>
          </div>
          <p className="text-gray-600">
            {isHeadOfPrograms ? "Head of Programs - Manage all users across all institutions" : `Institution Manager - Manage users from ${currentUserInstitution}`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold text-gray-900">{users.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-green-600">Active</CardTitle></CardHeader>
            <CardContent><div className="text-4xl font-bold text-green-600">{users.length}</div></CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="mb-6">
          <CardHeader><CardTitle>Search & Filter</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <Input id="search" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              {isHeadOfPrograms && (
                <div>
                  <Label htmlFor="institution">Institution</Label>
                  <select id="institution" value={filterInstitution} onChange={(e) => setFilterInstitution(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                    <option value="">All Institutions</option>
                    {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
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
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const roleInfo = ROLE_INFO[user.role]
                    const isCurrentUser = user.id === currentUserId
                    return (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          {user.full_name}
                          {isCurrentUser && <Badge className="ml-2 bg-blue-100 text-blue-800">You</Badge>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3"><Badge className={INSTITUTION_COLORS[user.institution]}>{user.institution}</Badge></td>
                        <td className="px-4 py-3"><Badge className={roleInfo?.color || "bg-gray-100"}>{roleInfo?.label || user.role}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openModal('role', user)}>Change Role</Button>
                            {isHeadOfPrograms && !isCurrentUser && user.role !== 'head_of_programs' && (
                              <Button size="sm" variant="outline" onClick={() => openModal('remove', user)} className="text-red-600">Remove</Button>
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

        {/* Modals */}
        {modalType && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              {modalType === 'role' && (
                <>
                  <h3 className="text-xl font-bold mb-4">Change User Role</h3>
                  
                  {selectedUser.id === currentUserId && currentUserRole === "institution_manager" && (
                    <Alert className="mb-4 bg-amber-50 border-amber-200">
                      <p className="text-sm text-amber-900">
                        ⚠️ You are changing your own role. You cannot promote yourself to Head of Programs.
                      </p>
                    </Alert>
                  )}
                  
                  <p className="text-gray-600 mb-4">Update the role for {selectedUser.full_name}</p>
                  <div className="mb-6">
                    <Label htmlFor="role">Select New Role</Label>
                    <select 
                      id="role" 
                      value={newRole} 
                      onChange={(e) => setNewRole(e.target.value)} 
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      {getAvailableRoles(selectedUser.id).map(role => {
                        const info = ROLE_INFO[role]
                        return (
                          <option key={role} value={role}>
                            {info.label} - {info.description}
                          </option>
                        )
                      })}
                    </select>
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
                      <div className="text-sm">You are about to remove <strong>{selectedUser.full_name}</strong> from the system. This action cannot be undone.</div>
                    </div>
                  </Alert>
                  <div className="mb-6">
                    <Label htmlFor="remove-reason">Reason for Removal <span className="text-red-500">*</span></Label>
                    <Textarea id="remove-reason" placeholder="Enter reason for removal..." value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setModalType(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleRemoveUser(selectedUser.id)}>Remove User</Button>
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