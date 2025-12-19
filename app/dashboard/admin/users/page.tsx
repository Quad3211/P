import { useState, useEffect } from "react"

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

const mockUsers = [
  { id: "1", email: "john.doe@heart-nsta.org", full_name: "John Doe", role: "instructor", institution: "Boys Town", approval_status: "pending", created_at: new Date().toISOString() },
  { id: "2", email: "jane.smith@heart-nsta.org", full_name: "Jane Smith", role: "instructor", institution: "Stony Hill", approval_status: "approved", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "3", email: "bob.wilson@heart-nsta.org", full_name: "Bob Wilson", role: "pc", institution: "Boys Town", approval_status: "approved", created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: "4", email: "alice.jones@heart-nsta.org", full_name: "Alice Jones", role: "instructor", institution: "Leap", approval_status: "pending", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "5", email: "mike.brown@heart-nsta.org", full_name: "Mike Brown", role: "amo", institution: "Stony Hill", approval_status: "approved", created_at: new Date(Date.now() - 259200000).toISOString() }
]

export default function HeadOfProgramsUserManagement() {
  const [users, setUsers] = useState(mockUsers)
  const [filteredUsers, setFilteredUsers] = useState(mockUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterInstitution, setFilterInstitution] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [newRole, setNewRole] = useState("instructor")
  const [rejectReason, setRejectReason] = useState("")
  const [removeReason, setRemoveReason] = useState("")

  useEffect(() => {
    let filtered = users
    if (searchQuery) {
      filtered = filtered.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    if (filterInstitution) filtered = filtered.filter(u => u.institution === filterInstitution)
    if (filterStatus) filtered = filtered.filter(u => u.approval_status === filterStatus)
    setFilteredUsers(filtered)
  }, [searchQuery, filterInstitution, filterStatus, users])

  const pendingCount = users.filter(u => u.approval_status === "pending").length
  const approvedCount = users.filter(u => u.approval_status === "approved").length
  const rejectedCount = users.filter(u => u.approval_status === "rejected").length
  const institutions = [...new Set(users.map(u => u.institution))]

  const handleApprove = (userId) => {
    setUsers(users.map(u => u.id === userId ? { ...u, approval_status: "approved", approved_at: new Date().toISOString() } : u))
    setModalType(null)
    setSelectedUser(null)
  }

  const handleReject = (userId) => {
    if (!rejectReason.trim()) { alert("Please provide a reason for rejection"); return }
    setUsers(users.map(u => u.id === userId ? { ...u, approval_status: "rejected", rejected_reason: rejectReason } : u))
    setModalType(null)
    setSelectedUser(null)
    setRejectReason("")
  }

  const handleUpdateRole = (userId) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    setModalType(null)
    setSelectedUser(null)
  }

  const handleRemoveUser = (userId) => {
    if (!removeReason.trim()) { alert("Please provide a reason for removal"); return }
    setUsers(users.filter(u => u.id !== userId))
    setModalType(null)
    setSelectedUser(null)
    setRemoveReason("")
  }

  const openModal = (type, user) => {
    setSelectedUser(user)
    setModalType(type)
    if (type === 'role') setNewRole(user.role)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">👥</span>
            <h1 className="text-4xl font-bold text-gray-900">User Management</h1>
          </div>
          <p className="text-gray-600">Head of Programs - Manage all users across all institutions</p>
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
                <Input id="search" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setFilterInstitution(""); setFilterStatus("") } } children={undefined} disabled={undefined}>Clear Filters</Button>
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
                        <td className="px-4 py-3"><Badge className={user.approval_status === "approved" ? "bg-green-100 text-green-800" : user.approval_status === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>{user.approval_status}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {user.approval_status === "pending" && <Button size="sm" variant="outline" onClick={() => openModal('approval', user)} children={undefined} disabled={undefined}>Review</Button>}
                            {user.approval_status === "approved" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => openModal('role', user)} children={undefined} disabled={undefined}>Change Role</Button>
                                <Button size="sm" variant="outline" onClick={() => openModal('remove', user)} className="text-red-600" children={undefined} disabled={undefined}>🚫</Button>
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
                      <Input id="reject-reason" placeholder="Enter reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setModalType(null)} children={undefined} disabled={undefined}>Cancel</Button>
                    <Button variant="outline" onClick={() => handleReject(selectedUser.id)} className="text-red-600" children={undefined} disabled={undefined}>Reject</Button>
                    <Button onClick={() => handleApprove(selectedUser.id)} children={undefined} disabled={undefined}>✓ Approve</Button>
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
                        {Object.entries(ROLE_INFO).map(([role, info]) => <option key={role} value={role}>{info.label} - {info.description}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setModalType(null)} children={undefined} disabled={undefined}>Cancel</Button>
                    <Button onClick={() => handleUpdateRole(selectedUser.id)} children={undefined} disabled={undefined}>Update Role</Button>
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
                    <Input id="remove-reason" placeholder="Enter reason for removal..." value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setModalType(null)} children={undefined} disabled={undefined}>Cancel</Button>
                    <Button onClick={() => handleRemoveUser(selectedUser.id)} className="bg-red-600 hover:bg-red-700 text-white" children={undefined} disabled={undefined}>Remove User</Button>
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