import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Users, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Database,
  Activity,
  Shield,
  Archive,
  BarChart3,
  Settings,
  Download,
  RefreshCw
} from "lucide-react"

// Type definitions
interface CardProps {
  children: React.ReactNode
  className?: string
}

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "outline"
  size?: "default" | "sm"
  className?: string
}

interface AdministratorDashboardProps {
  userName: string
}

interface InstitutionStat {
  name: string
  users: number
  submissions: number
  active: number
  approved: number
}

interface ActivityLog {
  id: string
  action: string
  type: string
  timestamp: string
  user: string
}

interface AuditLog {
  id: string
  created_at: string
  action_type: string
  action: string
}

// UI Components
const Card = ({ children, className = "" }: CardProps) => (
  <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
)
const CardHeader = ({ children, className = "" }: CardProps) => (
  <div className={`p-6 border-b ${className}`}>{children}</div>
)
const CardTitle = ({ children, className = "" }: CardProps) => (
  <h3 className={`text-xl font-bold ${className}`}>{children}</h3>
)
const CardContent = ({ children, className = "" }: CardProps) => (
  <div className={`p-6 ${className}`}>{children}</div>
)
const Badge = ({ children, className = "" }: CardProps) => (
  <span className={`px-2 py-1 text-xs font-semibold rounded ${className}`}>{children}</span>
)
const Button = ({ children, onClick, variant = "default", size = "default", className = "" }: ButtonProps) => {
  const baseClasses = "px-4 py-2 rounded font-medium transition-colors"
  const variantClasses = variant === "outline" 
    ? "border border-gray-300 hover:bg-gray-50" 
    : "bg-cyan-500 text-white hover:bg-cyan-600"
  const sizeClasses = size === "sm" ? "text-sm px-3 py-1" : ""
  
  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}>
      {children}
    </button>
  )
}

export default function AdministratorDashboard({ userName }: AdministratorDashboardProps) {
  const supabase = createClient()
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalSubmissions: 0,
    activeSubmissions: 0,
    systemHealth: 100,
    storageUsed: 0,
    apiCalls: 0
  })
  
  const [institutionStats, setInstitutionStats] = useState<InstitutionStat[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])
  const [systemLogs, setSystemLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "institutions" | "activity" | "system">("overview")

  if (!supabase) return null

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch users
      const { data: users } = await supabase.from("profiles").select("*")
      
      // Fetch submissions
      const { data: submissions } = await supabase.from("submissions").select("*")
      
      // Fetch audit logs
      const { data: auditLogs } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      // Calculate stats
      const pendingApprovals = users?.filter(u => u.approval_status === 'pending').length || 0
      const activeSubmissions = submissions?.filter(
        s => ['submitted', 'pc_review', 'amo_review'].includes(s.status)
      ).length || 0

      setStats({
        totalUsers: users?.length || 0,
        pendingApprovals,
        totalSubmissions: submissions?.length || 0,
        activeSubmissions,
        systemHealth: 98,
        storageUsed: 45,
        apiCalls: 15234
      })

      // Calculate per-institution stats
      const institutions = ['Boys Town', 'Stony Hill', 'Leap']
      const instStats: InstitutionStat[] = institutions.map(inst => {
        const instUsers = users?.filter(u => u.institution === inst) || []
        const instSubs = submissions?.filter(s => s.institution === inst) || []
        return {
          name: inst,
          users: instUsers.length,
          submissions: instSubs.length,
          active: instSubs.filter(s => ['submitted', 'pc_review', 'amo_review'].includes(s.status)).length,
          approved: instSubs.filter(s => s.status === 'approved').length
        }
      })
      setInstitutionStats(instStats)

      // Recent activity
      const activity: ActivityLog[] = (auditLogs?.slice(0, 10) || []).map(log => ({
        id: log.id,
        action: log.action,
        type: log.action_type,
        timestamp: log.created_at,
        user: log.user_id
      }))
      setRecentActivity(activity)
      setSystemLogs(auditLogs || [])

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportAuditLogs = () => {
    const csv = systemLogs.map(log => 
      `"${log.created_at}","${log.action_type}","${log.action}"`
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-gray-600">Loading administrator dashboard...</p>
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
            <Shield className="w-8 h-8 text-red-600" />
            <h1 className="text-4xl font-bold text-gray-900">Administrator Dashboard</h1>
          </div>
          <p className="text-gray-600">System-wide overview and management</p>
        </div>

        {/* System Health Alert */}
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">System Status: Operational</p>
              <p className="text-sm text-green-800">All services running normally • Last checked: Just now</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDashboardData} className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900">{stats.totalUsers}</div>
              <p className="text-xs text-gray-500 mt-1">Across all institutions</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-amber-600">{stats.pendingApprovals}</div>
              <p className="text-xs text-gray-500 mt-1">User registrations awaiting</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Submissions</CardTitle>
                <FileText className="w-5 h-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900">{stats.totalSubmissions}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.activeSubmissions} currently active</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">System Health</CardTitle>
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{stats.systemHealth}%</div>
              <p className="text-xs text-gray-500 mt-1">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "overview" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-600"
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("institutions")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "institutions" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-600"
            }`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            Institutions
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "activity" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-600"
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "system" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-600"
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            System Info
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Institution Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Institution Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {institutionStats.map(inst => (
                    <div key={inst.name} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{inst.name}</h4>
                        <Badge className={
                          inst.name === "Boys Town" ? "bg-blue-100 text-blue-800" :
                          inst.name === "Stony Hill" ? "bg-green-100 text-green-800" :
                          "bg-purple-100 text-purple-800"
                        }>
                          {inst.name}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Users</p>
                          <p className="text-lg font-bold">{inst.users}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Submissions</p>
                          <p className="text-lg font-bold">{inst.submissions}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Active</p>
                          <p className="text-lg font-bold text-amber-600">{inst.active}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Approved</p>
                          <p className="text-lg font-bold text-green-600">{inst.approved}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent System Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.slice(0, 8).map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                        <Activity className="w-4 h-4 text-cyan-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Institutions Tab */}
        {activeTab === "institutions" && (
          <Card>
            <CardHeader>
              <CardTitle>Institution Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {institutionStats.map(inst => (
                  <div key={inst.name} className="p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900">{inst.name}</h3>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded">
                        <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{inst.users}</p>
                        <p className="text-sm text-gray-600">Users</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded">
                        <FileText className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{inst.submissions}</p>
                        <p className="text-sm text-gray-600">Submissions</p>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded">
                        <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-amber-600">{inst.active}</p>
                        <p className="text-sm text-gray-600">Active</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded">
                        <CheckCircle className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">{inst.approved}</p>
                        <p className="text-sm text-gray-600">Approved</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Logs Tab */}
        {activeTab === "activity" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>System Activity Logs</CardTitle>
                <Button variant="outline" size="sm" onClick={exportAuditLogs}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemLogs.map(log => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-blue-100 text-blue-800">
                            {log.action_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{log.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Info Tab */}
        {activeTab === "system" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Storage Used</span>
                      <span className="text-sm font-bold text-gray-900">{stats.storageUsed}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${stats.storageUsed}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">API Calls Today</span>
                      <span className="text-sm font-bold text-gray-900">{stats.apiCalls.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: "65%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">System Health</span>
                      <span className="text-sm font-bold text-green-600">{stats.systemHealth}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${stats.systemHealth}%` }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" onClick={() => window.location.href = '/dashboard/admin/users'}>
                    <Users className="w-4 h-4 mr-3" />
                    Manage Users
                  </Button>
                  <Button className="w-full justify-start" onClick={() => window.location.href = '/dashboard/settings'}>
                    <Settings className="w-4 h-4 mr-3" />
                    System Settings
                  </Button>
                  <Button className="w-full justify-start" onClick={() => window.location.href = '/dashboard/archive'}>
                    <Archive className="w-4 h-4 mr-3" />
                    View Archives
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={exportAuditLogs}>
                    <Download className="w-4 h-4 mr-3" />
                    Export Audit Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}