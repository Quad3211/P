"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Search, Shield, Award, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

type UserRole = "instructor" | "senior_instructor" | "pc" | "amo" | "im" | "registration" | "records" | "admin"

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
  im: {
    label: "IM",
    description: "Secondary approval for PC and AMO",
    color: "bg-cyan-100 text-cyan-800"
  },
  registration: {
    label: "Registration",
    description: "View submissions",
    color: "bg-gray-100 text-gray-800"
  },
  records: {
    label: "Records Manager",
    description: "Archive and manage records",
    color: "bg-green-100 text-green-800"
  },
  admin: {
    label: "Administrator",
    description: "Full system access",
    color: "bg-red-100 text-red-800"
  }
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<UserRole>("instructor")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

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

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        setFilteredUsers(data)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (user: User) => {
    setSelectedUser(user)
    setNewRole(user.role as UserRole)
    setIsDialogOpen(true)
  }

  const handleUpdateRole = async () => {
    if (!selectedUser) return

    setUpdating(true)
    try {
      const response = await fetch("/api/users/update-role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: newRole,
        }),
      })

      if (response.ok) {
        await fetchUsers()
        setIsDialogOpen(false)
        setSelectedUser(null)
      } else {
        const error = await response.json()
        alert(`Failed to update role: ${error.error}`)
      }
    } catch (error) {
      console.error("Failed to update role:", error)
      alert("Failed to update role")
    } finally {
      setUpdating(false)
    }
  }

  const getRoleStats = () => {
    const stats: Record<string, number> = {}
    users.forEach((user) => {
      stats[user.role] = (stats[user.role] || 0) + 1
    })
    return stats
  }

  const roleStats = getRoleStats()

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-cyan-600" />
            <h1 className="text-4xl font-bold text-slate-900">User Management</h1>
          </div>
          <p className="text-slate-600">Manage user roles and permissions</p>
        </div>

        {/* Role Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          {Object.entries(ROLE_INFO).map(([role, info]) => (
            <Card key={role} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-600">{info.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{roleStats[role] || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secondary Approver Info */}
        <Card className="mb-6 bg-cyan-50 border-cyan-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-cyan-900 mb-2">Secondary Approval Authority</h4>
                <div className="space-y-1 text-sm text-cyan-800">
                  <p><strong>Senior Instructors:</strong> Can provide secondary approval for PC reviews when PC is unavailable</p>
                  <p><strong>IM & Admin:</strong> Can provide secondary approval for both PC and AMO reviews</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Users</span>
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

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
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Secondary Approval</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const roleInfo = ROLE_INFO[user.role as UserRole]
                      const canApprovePC = ["senior_instructor", "im", "admin"].includes(user.role)
                      const canApproveAMO = ["im", "admin"].includes(user.role)

                      return (
                        <tr key={user.id} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{user.full_name}</td>
                          <td className="px-4 py-3 text-slate-600">{user.email}</td>
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
                              <span className="text-slate-400 text-xs">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRoleChange(user)}
                              className="gap-2"
                            >
                              {user.role === "senior_instructor" && <Award className="w-3 h-3" />}
                              Change Role
                            </Button>
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

        {/* Role Change Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedUser?.full_name} ({selectedUser?.email})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="role">Select New Role</Label>
                <select
                  id="role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md mt-2"
                >
                  {Object.entries(ROLE_INFO).map(([role, info]) => (
                    <option key={role} value={role}>
                      {info.label} - {info.description}
                    </option>
                  ))}
                </select>
              </div>

              {newRole === "senior_instructor" && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <Award className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <div className="text-sm text-purple-800">
                      <p className="font-semibold mb-1">Senior Instructor</p>
                      <p>This user will be able to provide secondary approval for PC reviews when the primary PC reviewer is unavailable.</p>
                    </div>
                  </div>
                </div>
              )}

              {["im", "admin"].includes(newRole) && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <Shield className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                    <div className="text-sm text-cyan-800">
                      <p className="font-semibold mb-1">Full Secondary Approval Authority</p>
                      <p>This user will be able to provide secondary approval for both PC and AMO reviews.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={updating || newRole === selectedUser?.role}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                {updating ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}