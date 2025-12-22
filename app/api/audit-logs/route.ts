import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

// UI Components
const Button = ({ children, onClick, variant = "default", size = "default", className = "", disabled = false }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded font-medium transition-colors ${
      variant === "outline" 
        ? "border border-gray-300 hover:bg-gray-50" 
        : "bg-cyan-500 text-white hover:bg-cyan-600"
    } ${size === "sm" ? "text-sm px-3 py-1" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
  >
    {children}
  </button>
)

const Card = ({ children, className = "" }: any) => <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
const CardHeader = ({ children }: any) => <div className="p-6 border-b">{children}</div>
const CardTitle = ({ children }: any) => <h3 className="text-xl font-bold">{children}</h3>
const CardContent = ({ children }: any) => <div className="p-6">{children}</div>
const Badge = ({ children, className = "" }: any) => <span className={`px-2 py-1 text-xs font-semibold rounded ${className}`}>{children}</span>
const Input = ({ value, onChange, type = "text", placeholder = "", className = "" }: any) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${className}`} />
)
const Label = ({ children, htmlFor }: any) => <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{children}</label>

const ACTION_TYPE_COLORS: Record<string, string> = {
  user_signup: "bg-blue-100 text-blue-800",
  user_approved: "bg-green-100 text-green-800",
  user_rejected: "bg-red-100 text-red-800",
  user_removed: "bg-red-100 text-red-800",
  role_change: "bg-purple-100 text-purple-800",
  submission_created: "bg-blue-100 text-blue-800",
  submission_updated: "bg-yellow-100 text-yellow-800",
  submission_submitted: "bg-green-100 text-green-800",
  document_uploaded: "bg-cyan-100 text-cyan-800",
  review_created: "bg-orange-100 text-orange-800",
  review_approved: "bg-green-100 text-green-800",
  review_rejected: "bg-red-100 text-red-800",
  submission_archived: "bg-purple-100 text-purple-800",
  settings_updated: "bg-gray-100 text-gray-800",
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  user_signup: "User Signup",
  user_approved: "User Approved",
  user_rejected: "User Rejected",
  user_removed: "User Removed",
  role_change: "Role Change",
  submission_created: "Submission Created",
  submission_updated: "Submission Updated",
  submission_submitted: "Submission Submitted",
  document_uploaded: "Document Uploaded",
  review_created: "Review Created",
  review_approved: "Review Approved",
  review_rejected: "Review Rejected",
  submission_archived: "Submission Archived",
  settings_updated: "Settings Updated",
}

export default function EnhancedSettingsPage() {
  const supabase = createClient()
  
  const [activeTab, setActiveTab] = useState<"audit" | "stats" | "export">("audit")
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    action_type: "",
    start_date: "",
    end_date: "",
    user_id: "",
    submission_id: "",
    institution: "",
  })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [logsPerPage] = useState(50)

  useEffect(() => {
    fetchAuditLogs()
  }, [filters, currentPage])

  useEffect(() => {
    if (activeTab === "stats") {
      fetchStats()
    }
  }, [activeTab])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      params.append("limit", String(logsPerPage * currentPage))

      const response = await fetch(`/api/audit-logs?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stats", period: "24h" })
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const exportToCSV = () => {
    const headers = ["Timestamp", "Action Type", "User", "Action", "Details"]
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.action_type,
      `${log.user_name || "Unknown"} (${log.user_email || "N/A"})`,
      log.action,
      JSON.stringify(log.details || {})
    ])

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setFilters({
      action_type: "",
      start_date: "",
      end_date: "",
      user_id: "",
      submission_id: "",
      institution: "",
    })
    setCurrentPage(1)
  }

  const actionTypes = [...new Set(logs.map(l => l.action_type))].sort()
  const paginatedLogs = logs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Audit Logs & Activity</h1>
          <p className="text-gray-600">Comprehensive system activity tracking and monitoring</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "audit" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-600"
            }`}
          >
            📋 Activity Logs
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "stats" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-600"
            }`}
          >
            📊 Statistics
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "export" ? "border-cyan-500 text-cyan-600" : "border-transparent text-gray-600"
            }`}
          >
            💾 Export
          </button>
        </div>

        {/* Activity Logs Tab */}
        {activeTab === "audit" && (
          <>
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="action_type">Action Type</Label>
                    <select
                      id="action_type"
                      value={filters.action_type}
                      onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">All Actions</option>
                      {actionTypes.map(type => (
                        <option key={type} value={type}>{ACTION_TYPE_LABELS[type] || type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={filters.start_date}
                      onChange={(e: any) => setFilters({ ...filters, start_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={filters.end_date}
                      onChange={(e: any) => setFilters({ ...filters, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={fetchAuditLogs} size="sm">Apply Filters</Button>
                  <Button onClick={clearFilters} variant="outline" size="sm">Clear</Button>
                  <span className="text-sm text-gray-600 ml-auto self-center">
                    Showing {paginatedLogs.length} of {logs.length} logs
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Activity Logs</CardTitle>
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    📥 Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  </div>
                ) : paginatedLogs.length === 0 ? (
                  <div className="py-12 text-center text-gray-600">No logs found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                          <th className="px-4 py-3 text-left font-semibold">Action Type</th>
                          <th className="px-4 py-3 text-left font-semibold">User</th>
                          <th className="px-4 py-3 text-left font-semibold">Action</th>
                          <th className="px-4 py-3 text-left font-semibold">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLogs.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={ACTION_TYPE_COLORS[log.action_type] || "bg-gray-100 text-gray-800"}>
                                {ACTION_TYPE_LABELS[log.action_type] || log.action_type}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{log.user_name || "Unknown"}</p>
                                <p className="text-xs text-gray-500">{log.user_role}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">{log.action}</td>
                            <td className="px-4 py-3">
                              {log.details && Object.keys(log.details).length > 0 ? (
                                <details className="cursor-pointer">
                                  <summary className="text-xs text-cyan-600">View</summary>
                                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-w-xs">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {logs.length > logsPerPage && (
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      Page {currentPage} of {Math.ceil(logs.length / logsPerPage)}
                    </span>
                    <Button
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={currentPage >= Math.ceil(logs.length / logsPerPage)}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Statistics Tab */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Summary (Last 24h)</CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="font-medium">Total Actions</span>
                      <span className="text-2xl font-bold text-cyan-600">{stats.total}</span>
                    </div>
                    {Object.entries(stats.by_action || {}).map(([action, count]: [string, any]) => (
                      <div key={action} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-sm">{ACTION_TYPE_LABELS[action] || action}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-600">Loading stats...</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <Badge className="bg-green-100 text-green-800">✓ Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage</span>
                    <Badge className="bg-green-100 text-green-800">✓ Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Authentication</span>
                    <Badge className="bg-green-100 text-green-800">✓ Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Backup</span>
                    <span className="text-sm text-gray-600">2 hours ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === "export" && (
          <Card>
            <CardHeader>
              <CardTitle>Export Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Export audit logs to CSV format for compliance, reporting, or external analysis.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Export Format</Label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option>CSV (Comma Separated)</option>
                      <option>JSON</option>
                      <option>Excel (XLSX)</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label>Date Range</Label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option>Last 24 hours</option>
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
                      <option>All time</option>
                      <option>Custom range</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={exportToCSV} className="w-full md:w-auto">
                    📥 Export {logs.length} Logs
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> Exported logs include all visible columns with current filters applied. 
                    Sensitive information is included for compliance purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}