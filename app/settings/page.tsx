"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Navigation from "@/components/shared/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Download, Filter, RefreshCw } from "lucide-react"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    action_type: "",
    start_date: "",
    end_date: "",
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (data) {
        setProfile(data)

        // Allow admins, records managers, and IM to access settings
        if (!["admin", "records", "im"].includes(data.role)) {
          router.push("/dashboard")
          return
        }
      }

      fetchAuditLogs()
      fetchSettings()
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  const fetchAuditLogs = async (downloadMode = false) => {
    try {
      const params = new URLSearchParams()
      if (filters.action_type) params.append("action_type", filters.action_type)
      if (filters.start_date) params.append("start_date", filters.start_date)
      if (filters.end_date) params.append("end_date", filters.end_date)
      if (downloadMode) params.append("download", "true")

      const url = `/api/audit-logs?${params.toString()}`

      if (downloadMode) {
        // Trigger download
        window.open(url, "_blank")
      } else {
        const response = await fetch(url)
        if (response.ok) {
          const logs = await response.json()
          setAuditLogs(logs)
        }
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/workflow")
      if (response.ok) {
        const settingsData = await response.json()
        setSettings(settingsData)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleDownload = () => {
    fetchAuditLogs(true)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    fetchAuditLogs(false)
  }

  const clearFilters = () => {
    setFilters({
      action_type: "",
      start_date: "",
      end_date: "",
    })
    setTimeout(() => fetchAuditLogs(false), 100)
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userName={profile.full_name} userRole={profile.role} onSignOut={handleSignOut} />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Settings & Audit Logs</h1>
              <p className="text-slate-600">System configuration and activity monitoring</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Workflow Settings */}
            <Card className="border-0 shadow-sm bg-white lg:col-span-1">
              <CardHeader>
                <CardTitle>Workflow Configuration</CardTitle>
                <CardDescription>System-wide settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Review Timeouts (days)</Label>
                  <Input
                    type="number"
                    defaultValue={settings?.review_timeouts_days || 14}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Escalation Email</Label>
                  <Input
                    type="email"
                    defaultValue={settings?.escalation_email || ""}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">File Retention (years)</Label>
                  <Input
                    type="number"
                    defaultValue={settings?.file_retention_years || 5}
                    disabled
                    className="bg-slate-50"
                  />
                </div>

                {profile.role === "admin" && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-slate-500 mb-2">Role Permissions</p>
                    <div className="space-y-1 text-xs">
                      <p className="text-slate-700">
                        <strong>IM & Admin:</strong> Secondary approvers
                      </p>
                      <p className="text-slate-500">Can approve when AMO unavailable</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audit Logs */}
            <Card className="border-0 shadow-sm bg-white lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Activity Log</CardTitle>
                    <CardDescription>Complete system audit trail</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={applyFilters}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Action Type</Label>
                    <select
                      value={filters.action_type}
                      onChange={(e) => handleFilterChange("action_type", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="">All Actions</option>
                      <option value="submitted">Submitted</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => handleFilterChange("start_date", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => handleFilterChange("end_date", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="default" size="sm" onClick={applyFilters} className="bg-cyan-500 hover:bg-cyan-600">
                    <Filter className="w-4 h-4 mr-2" />
                    Apply Filters
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Date & Time</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Submission</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                            No activity logged yet
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log, idx) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-slate-900 font-medium text-sm">
                                {log.user?.full_name || "System"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {log.user?.role?.toUpperCase() || "N/A"}
                                {log.details?.review_type === "secondary" && " (Secondary)"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  log.action_type === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : log.action_type === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : log.action_type === "submitted"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-slate-100 text-slate-800"
                                }`}
                              >
                                {log.action_type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-slate-900">{log.submission?.submission_id || "N/A"}</div>
                              <div className="text-xs text-slate-500 truncate max-w-[200px]">
                                {log.submission?.title || ""}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs max-w-[300px] truncate">
                              {log.action}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}