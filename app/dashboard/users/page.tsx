import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

// UI Components
const Button = ({ children, onClick, disabled, variant = "default", size = "default", className = "" }) => (
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

const Card = ({ children, className = "" }) => <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
const CardHeader = ({ children, className = "" }) => <div className={`p-6 border-b ${className}`}>{children}</div>
const CardTitle = ({ children, className = "" }) => <h3 className={`text-xl font-bold ${className}`}>{children}</h3>
const CardContent = ({ children, className = "" }) => <div className={`p-6 ${className}`}>{children}</div>
const Badge = ({ children, className = "" }) => <span className={`px-2 py-1 text-xs font-semibold rounded ${className}`}>{children}</span>
const Input = ({ value, onChange, placeholder, className = "" }) => (
  <input type="text" value={value} onChange={onChange} placeholder={placeholder} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${className}`} />
)
const Label = ({ children, htmlFor }) => <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
const Alert = ({ children, className = "" }) => <div className={`rounded-lg p-4 border ${className}`}>{children}</div>
const Textarea = ({ value, onChange, placeholder, rows = 3, className = "" }) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${className}`} />
)

const ROLE_INFO = {
  instructor: { label: "Instructor", description: "Submit and track submissions", color: "bg-blue-100 text-blue-800" },
  senior_instructor: { label: "Senior Instructor", description: "Secondary approval for PC reviews", color: "bg-purple-100 text-purple-800" },
  pc: { label: "PC Reviewer", description: "Primary reviewer - first level", color: "bg-yellow-100 text-yellow-800" },
  amo: { label: "AMO Reviewer", description: "Primary reviewer - final approval", color: "bg-orange-100 text-orange-800" },
  institution_manager: { label: "Institution Manager", description: "Manages users within institution", color: "bg-cyan-100 text-cyan-800" },
  records: { label: "Records Manager", description: "Archive and manage records", color: "bg-green-100 text-green-800" },
  head_of_programs: { label: "Head of Programs", description: "System administrator - all institutions", color: "bg-red-100 text-red-800" }
}

const INSTITUTION_COLORS = {
  "Boys Town": "bg-blue-100 text-blue-800",
  "Stony Hill": "bg-green-100 text-green-800",
  "Leap": "bg-purple-100 text-purple-800"
}

export default function UnifiedUserManagement() {
  const supabase = createClient()
  
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterInstitution, setFilterInstitution] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [newRole, setNewRole] = useState("instructor")
  const [rejectReason, setRejectReason] = useState("")
  const [removeReason, setRemoveReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserRole, setCurrentUserRole] = useState("")
  const [currentUserInstitution, setCurrentUserInstitution] = useState("")
  const [activeTab, setActiveTab] = useState("users")

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
    } catch (err) {
      console.error("Error:", err)
      setError(err.message || "Failed to load data")
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
    } catch (err) {
      console.error("Error fetching users:", err)
      setError(err.message || "Failed to fetch users")
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

  const pendingCount = 0
  const approvedCount = users.length
  const rejectedCount = 0
  const institutions = [...new Set(users.map((u) => u.institution))]

  const handleUpdateRole = async (userId) => {
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
    } catch (err) {
      alert(err.message || "Failed to update role")
    }
  }

  const handleRemoveUser = async (userId) => {
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
    } catch (err) {
      alert(err.message || "Failed to remove user")
    }
  }

  const openModal = (type, user) => {
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

        {/* Tabs - Only show for Head of Programs */}
        {isHeadOfPrograms && (
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === "users"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === "admin"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              🔐 Super Admin Privileges
            </button>
          </div>
        )}

        {activeTab === "users" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle></CardHeader>
                <CardContent><div className="text-4xl font-bold text-gray-900">{users.length}</div></CardContent>
              </Card>
              {isHeadOfPrograms && (
                <Card className="border-2 border-amber-200">
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-amber-600">Pending Approval</CardTitle></CardHeader>
                  <CardContent><div className="text-4xl font-bold text-amber-600">{pendingCount}</div></CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-green-600">Active</CardTitle></CardHeader>
                <CardContent><div className="text-4xl font-bold text-green-600">{approvedCount}</div></CardContent>
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
                        return (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{user.full_name}</td>
                            <td className="px-4 py-3 text-gray-600">{user.email}</td>
                            <td className="px-4 py-3"><Badge className={INSTITUTION_COLORS[user.institution]}>{user.institution}</Badge></td>
                            <td className="px-4 py-3"><Badge className={roleInfo?.color || "bg-gray-100"}>{roleInfo?.label || user.role}</Badge></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => openModal('role', user)}>Change Role</Button>
                                {isHeadOfPrograms && user.role !== 'head_of_programs' && (
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
          </>
        ) : (
          /* Super Admin Privileges Section */
          <div className="space-y-6">
            <Alert className="bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔐</span>
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">Super Admin Privileges</h4>
                  <p className="text-sm text-red-800">
                    These are powerful administrative functions. Use with caution as changes affect the entire system across all institutions.
                  </p>
                </div>
              </div>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* System Configuration */}
              <Card className="border-2 border-red-200">
                <CardHeader className="bg-red-50">
                  <CardTitle className="text-red-900">🔧 System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    📊 View System Analytics
                  </Button>
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    ⚙️ Workflow Settings
                  </Button>
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    📧 Email Templates
                  </Button>
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    🏢 Institution Management
                  </Button>
                </CardContent>
              </Card>

              {/* User Approvals */}
              <Card className="border-2 border-amber-200">
                <CardHeader className="bg-amber-50">
                  <CardTitle className="text-amber-900">✅ Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-4xl mb-2">0</p>
                    <p className="text-gray-600">No pending user registrations</p>
                  </div>
                </CardContent>
              </Card>

              {/* Audit & Compliance */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-blue-900">📋 Audit & Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    📜 View Audit Logs (All Institutions)
                  </Button>
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    📈 Generate Compliance Report
                  </Button>
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    🔍 Review Activity Logs
                  </Button>
                </CardContent>
              </Card>

              {/* Security */}
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50">
                  <CardTitle className="text-purple-900">🛡️ Security & Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    🔑 Manage Access Levels
                  </Button>
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    🚨 View Security Alerts
                  </Button>
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    🔒 Password Policies
                  </Button>
                </CardContent>
              </Card>

              {/* Database Management */}
              <Card className="border-2 border-green-200">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-green-900">💾 Database Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    💿 Backup Database
                  </Button>
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    📦 Archive Old Records
                  </Button>
                  <Button className="w-full justify-start bg-white text-gray-900 border border-gray-300 hover:bg-gray-50">
                    🧹 Data Cleanup Tools
                  </Button>
                </CardContent>
              </Card>

              {/* Dangerous Actions */}
              <Card className="border-2 border-red-500">
                <CardHeader className="bg-red-100">
                  <CardTitle className="text-red-900">⚠️ Dangerous Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="destructive" className="w-full justify-start">
                    🗑️ Bulk Delete Users
                  </Button>
                  <Button variant="destructive" className="w-full justify-start">
                    🔄 Reset All Passwords
                  </Button>
                  <Button variant="destructive" className="w-full justify-start">
                    ⚡ Force Sync Database
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Modals */}
        {modalType && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              {modalType === 'role' && (
                <>
                  <h3 className="text-xl font-bold mb-4">Change User Role</h3>
                  <p className="text-gray-600 mb-4">Update the role for {selectedUser.full_name}</p>
                  <div className="mb-6">
                    <Label htmlFor="role">Select New Role</Label>
                    <select id="role" value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                      {Object.entries(ROLE_INFO).map(([role, info]) => (
                        <option key={role} value={role}>{info.label} - {info.description}</option>
                      ))}
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