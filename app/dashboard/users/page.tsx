import { useState, useEffect } from "react"

// Reusing same UI components from previous artifact
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

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
)

const CardHeader = ({ children }) => (
  <div className="p-6 border-b">{children}</div>
)

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-xl font-bold ${className}`}>{children}</h3>
)

const CardContent = ({ children }) => (
  <div className="p-6">{children}</div>
)

const Badge = ({ children, className = "" }) => (
  <span className={`px-2 py-1 text-xs font-semibold rounded ${className}`}>
    {children}
  </span>
)

const Input = ({ value, onChange, placeholder }) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full px-3 py-2 border border-gray-300 rounded-md"
  />
)

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
    {children}
  </label>
)

const Alert = ({ children, className = "" }) => (
  <div className={`rounded-lg p-4 border ${className}`}>{children}</div>
)

// Icons
const Users = () => <span>👥</span>
const Building2 = () => <span>🏢</span>
const Award = () => <span>🏆</span>
const Shield = () => <span>🛡️</span>

const ROLE_INFO = {
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
  }
}

// Mock data - only users from Boys Town
const mockUsers = [
  {
    id: "1",
    email: "john.doe@heart-nsta.org",
    full_name: "John Doe",
    role: "instructor",
    institution: "Boys Town",
    created_at: new Date().toISOString()
  },
  {
    id: "2",
    email: "bob.wilson@heart-nsta.org",
    full_name: "Bob Wilson",
    role: "pc",
    institution: "Boys Town",
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "3",
    email: "alice.johnson@heart-nsta.org",
    full_name: "Alice Johnson",
    role: "senior_instructor",
    institution: "Boys Town",
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
]

export default function InstitutionManagerUserManagement() {
  const currentInstitution = "Boys Town" // This would come from user context
  const [users, setUsers] = useState(mockUsers)
  const [filteredUsers, setFilteredUsers] = useState(mockUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRole, setNewRole] = useState("instructor")

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchQuery, users])

  const getRoleStats = () => {
    const stats = {}
    users.forEach((user) => {
      stats[user.role] = (stats[user.role] || 0) + 1
    })
    return stats
  }

  const roleStats = getRoleStats()

  const handleRoleChange = (user) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setIsModalOpen(true)
  }

  const handleUpdateRole = () => {
    setUsers(users.map(u => 
      u.id === selectedUser.id ? { ...u, role: newRole } : u
    ))
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users />
            <h1 className="text-4xl font-bold text-gray-900">User Management</h1>
          </div>
          <p className="text-gray-600">Manage user roles and permissions for your institution</p>
          <div className="flex items-center gap-2 mt-2">
            <Building2 />
            <span className="text-sm text-gray-600">
              Managing users from: <Badge className="bg-blue-100 text-blue-800">{currentInstitution}</Badge>
            </span>
          </div>
        </div>

        {/* Institution Notice */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Building2 />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Institution-Based Access</h4>
              <p className="text-sm text-blue-800">
                You can only view and manage users from <strong>{currentInstitution}</strong>. Users can only access 
                submissions and data from their assigned institution.
              </p>
            </div>
          </div>
        </Alert>

        {/* Role Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {Object.entries(ROLE_INFO).map(([role, info]) => (
            <Card key={role}>
              <CardHeader>
                <h4 className="text-xs font-medium text-gray-600">{info.label}</h4>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{roleStats[role] || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Institution Users</CardTitle>
              <span className="text-sm text-gray-600">{filteredUsers.length} users</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="search">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Role</th>
                    <th className="px-4 py-3 text-left font-semibold">Secondary Approval</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const roleInfo = ROLE_INFO[user.role]
                    const canApprovePC = ["senior_instructor", "institution_manager"].includes(user.role)
                    const canApproveAMO = user.role === "institution_manager"

                    return (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{user.full_name}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <Badge className={roleInfo?.color || "bg-gray-100 text-gray-800"}>
                            {roleInfo?.label || user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {canApprovePC || canApproveAMO ? (
                            <div className="flex gap-1">
                              {canApprovePC && (
                                <Badge variant="outline" className="text-xs">
                                  PC
                                </Badge>
                              )}
                              {canApproveAMO && (
                                <Badge variant="outline" className="text-xs">
                                  AMO
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user)}
                          >
                            {user.role === "senior_instructor" && <Award />}
                            Change Role
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Role Change Modal */}
        {isModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Change User Role</h3>
              <p className="text-gray-600 mb-4">
                Update the role for {selectedUser.full_name} ({selectedUser.email})
              </p>

              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Building2 />
                  <span>Institution: <strong>{selectedUser.institution}</strong></span>
                </div>
              </Alert>

              <div className="mb-6">
                <Label htmlFor="role">Select New Role</Label>
                <select
                  id="role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {Object.entries(ROLE_INFO).map(([role, info]) => (
                    <option key={role} value={role}>
                      {info.label} - {info.description}
                    </option>
                  ))}
                </select>
              </div>

              {newRole === "senior_instructor" && (
                <Alert className="mb-4 bg-purple-50 border-purple-200">
                  <div className="flex gap-2">
                    <Award />
                    <div className="text-sm text-purple-800">
                      <p className="font-semibold mb-1">Senior Instructor</p>
                      <p>This user will be able to provide secondary approval for PC reviews when the primary PC reviewer is unavailable.</p>
                    </div>
                  </div>
                </Alert>
              )}

              {newRole === "institution_manager" && (
                <Alert className="mb-4 bg-cyan-50 border-cyan-200">
                  <div className="flex gap-2">
                    <Shield />
                    <div className="text-sm text-cyan-800">
                      <p className="font-semibold mb-1">Full Secondary Approval Authority</p>
                      <p>This user will be able to provide secondary approval for both PC and AMO reviews, and manage users from {selectedUser.institution}.</p>
                    </div>
                  </div>
                </Alert>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateRole}
                  disabled={newRole === selectedUser.role}
                >
                  Update Role
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}