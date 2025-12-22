"use client"

import { useState, useEffect } from "react"

// Type Definitions
interface User {
  id: string
  email: string
  full_name: string
  role: string
  institution: "Boys Town" | "Stony Hill" | "Leap"
  approval_status: "pending" | "approved" | "rejected"
  created_at: string
}

interface Submission {
  id: string
  submission_id: string
  title?: string
  skill_area?: string
  instructor_id: string
  instructor_name: string
  institution: "Boys Town" | "Stony Hill" | "Leap"
  status: string
  created_at: string
  updated_at?: string
}

interface InstitutionStats {
  total: number
  pending: number
  approved: number
}

interface DashboardStats {
  totalUsers: number
  pendingApprovals: number
  approvedUsers: number
  totalSubmissions: number
  activeSubmissions: number
  byInstitution: Record<string, InstitutionStats>
  recentSignups: number
}

// UI Components with proper types
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
)

const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 border-b ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-xl font-bold ${className}`}>{children}</h3>
)

const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`px-2 py-1 text-xs font-semibold rounded ${className}`}>{children}</span>
)

const Input = ({
  id,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  id?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
}) => (
  <input
    id={id}
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${className}`}
  />
)

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
    {children}
  </label>
)

const INSTITUTION_COLORS: Record<string, string> = {
  "Boys Town": "bg-blue-100 text-blue-800",
  "Stony Hill": "bg-green-100 text-green-800",
  Leap: "bg-purple-100 text-purple-800",
}

const ROLE_INFO: Record<string, { label: string; color: string }> = {
  instructor: { label: "Instructor", color: "bg-blue-100 text-blue-800" },
  senior_instructor: { label: "Senior Instructor", color: "bg-purple-100 text-purple-800" },
  pc: { label: "PC", color: "bg-yellow-100 text-yellow-800" },
  amo: { label: "AMO", color: "bg-orange-100 text-orange-800" },
  institution_manager: { label: "Institution Manager", color: "bg-cyan-100 text-cyan-800" },
  registration: { label: "Registration", color: "bg-pink-100 text-pink-800" },
  records: { label: "Records", color: "bg-green-100 text-green-800" },
  administrator: { label: "Administrator", color: "bg-red-100 text-red-800" },
}

export default function RegistrationDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterInstitution, setFilterInstitution] = useState("")
  const [activeTab, setActiveTab] = useState<"overview" | "submissions">("overview")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch users
      const usersResponse = await fetch("/api/users")
      if (usersResponse.ok) {
        const usersData: User[] = await usersResponse.json()
        setUsers(usersData)

        // Fetch submissions
        const submissionsResponse = await fetch("/api/submissions")
        if (submissionsResponse.ok) {
          const submissionsData: Submission[] = await submissionsResponse.json()
          setSubmissions(submissionsData)

          // Calculate stats with both datasets
          calculateStats(usersData, submissionsData)
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (usersData: User[], submissionsData: Submission[]) => {
    const totalUsers = usersData.length
    const pendingApprovals = usersData.filter((u) => u.approval_status === "pending").length
    const approvedUsers = usersData.filter((u) => u.approval_status === "approved").length

    const totalSubmissions = submissionsData.length
    const activeSubmissions = submissionsData.filter((s) =>
      ["submitted", "pc_review", "amo_review"].includes(s.status)
    ).length

    // Group by institution
    const byInstitution: Record<string, InstitutionStats> = {}
    usersData.forEach((user) => {
      const inst = user.institution
      if (!byInstitution[inst]) {
        byInstitution[inst] = { total: 0, pending: 0, approved: 0 }
      }
      byInstitution[inst].total++
      if (user.approval_status === "pending") byInstitution[inst].pending++
      if (user.approval_status === "approved") byInstitution[inst].approved++
    })

    // Recent signups (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentSignups = usersData.filter((u) => new Date(u.created_at) > weekAgo).length

    setStats({
      totalUsers,
      pendingApprovals,
      approvedUsers,
      totalSubmissions,
      activeSubmissions,
      byInstitution,
      recentSignups,
    })
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesInstitution = !filterInstitution || user.institution === filterInstitution
    return matchesSearch && matchesInstitution
  })

  const institutions: string[] = [...new Set(users.map((u) => u.institution))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📋</span>
            <h1 className="text-4xl font-bold text-gray-900">Registration Dashboard</h1>
          </div>
          <p className="text-gray-600">View-only access to all users and submissions across institutions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Across all institutions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-600">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-amber-600">{stats?.pendingApprovals || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">Total Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{stats?.totalSubmissions || 0}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600">Recent Signups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">{stats?.recentSignups || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Institution Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Users by Institution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats?.byInstitution &&
                Object.entries(stats.byInstitution).map(([inst, data]) => (
                  <div key={inst} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{inst}</h4>
                      <Badge className={INSTITUTION_COLORS[inst]}>{inst}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="text-lg font-bold">{data.total}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Approved</p>
                        <p className="text-lg font-bold text-green-600">{data.approved}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Pending</p>
                        <p className="text-lg font-bold text-amber-600">{data.pending}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Read-Only Notice */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900">Registration Role - View Only Access</p>
              <p className="text-sm text-blue-800 mt-1">
                As a Registration officer, you have read-only access to view all users and submissions across all
                institutions. You cannot modify any data. Contact an Administrator or Institution Manager to make
                changes.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "overview" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-600"
            }`}
          >
            Users Overview
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "submissions" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-600"
            }`}
          >
            Submissions Overview
          </button>
        </div>

        {/* Users Table */}
        {activeTab === "overview" && (
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
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
              </div>
            </CardHeader>
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
                      <th className="px-4 py-3 text-left font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const roleInfo = ROLE_INFO[user.role] || { label: user.role, color: "bg-gray-100" }
                      return (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{user.full_name}</td>
                          <td className="px-4 py-3 text-gray-600">{user.email}</td>
                          <td className="px-4 py-3">
                            <Badge className={INSTITUTION_COLORS[user.institution]}>{user.institution}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
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
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submissions Overview */}
        {activeTab === "submissions" && (
          <Card>
            <CardHeader>
              <CardTitle>Submissions Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Active Submissions</p>
                    <p className="text-3xl font-bold text-blue-600">{stats?.activeSubmissions || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-3xl font-bold text-green-600">
                      {submissions.filter((s) => s.status === "approved").length}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">In Review</p>
                    <p className="text-3xl font-bold text-amber-600">
                      {submissions.filter((s) => ["pc_review", "amo_review"].includes(s.status)).length}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm mt-4">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left font-semibold">ID</th>
                        <th className="px-4 py-3 text-left font-semibold">Institution</th>
                        <th className="px-4 py-3 text-left font-semibold">Instructor</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.slice(0, 20).map((submission) => (
                        <tr key={submission.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-cyan-600">{submission.submission_id}</td>
                          <td className="px-4 py-3">
                            <Badge className={INSTITUTION_COLORS[submission.institution]}>{submission.institution}</Badge>
                          </td>
                          <td className="px-4 py-3">{submission.instructor_name}</td>
                          <td className="px-4 py-3">
                            <Badge
                              className={
                                submission.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : submission.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {submission.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}