"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Download, Filter, RefreshCw, Users, Shield, Bell, Save } from "lucide-react"
import { Switch } from "@/components/ui/switch"

// Mock audit logs
const mockAuditLogs = [
  {
    id: "1",
    created_at: "2024-12-14T10:30:00Z",
    user: { full_name: "Dr. Sarah Johnson", role: "instructor" },
    action: "Created submission",
    action_type: "created",
    submission: { submission_id: "RFA-2024-00145", title: "Advanced Physics Test" },
  },
  {
    id: "2",
    created_at: "2024-12-14T09:15:00Z",
    user: { full_name: "Prof. Michael Chen", role: "pc" },
    action: "PC review: approved submission",
    action_type: "approved",
    submission: { submission_id: "RFA-2024-00144", title: "Chemistry Lab Exam" },
  },
  {
    id: "3",
    created_at: "2024-12-13T16:45:00Z",
    user: { full_name: "Dr. Emily Rodriguez", role: "amo" },
    action: "AMO review: approved submission",
    action_type: "approved",
    submission: { submission_id: "RFA-2024-00143", title: "Biology Midterm" },
  },
]

export default function SettingsPage() {
  const [auditLogs, setAuditLogs] = useState(mockAuditLogs)
  const [filters, setFilters] = useState({
    action_type: "",
    start_date: "",
    end_date: "",
  })
  const [settings, setSettings] = useState({
    review_timeouts_days: 14,
    escalation_email: "admin-escalations@school.edu",
    file_retention_years: 5,
    email_notifications: true,
    auto_archive: true,
    require_two_factor: false,
  })
  const [activeTab, setActiveTab] = useState<"workflow" | "audit" | "notifications" | "security">("workflow")

  const applyFilters = () => {
    console.log("Applying filters:", filters)
    // In production, fetch filtered logs from API
  }

  const clearFilters = () => {
    setFilters({
      action_type: "",
      start_date: "",
      end_date: "",
    })
  }

  const handleDownload = () => {
    console.log("Downloading audit logs...")
    // In production, trigger CSV download
  }

  const saveSettings = () => {
    console.log("Saving settings:", settings)
    alert("Settings saved successfully!")
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-cyan-600" />
            <h1 className="text-4xl font-bold text-slate-900">Settings & Administration</h1>
          </div>
          <p className="text-slate-600">Manage system configuration, audit logs, and security settings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("workflow")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "workflow"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Workflow Settings
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "audit"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "notifications"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === "security"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Security
          </button>
        </div>

        {/* Workflow Settings Tab */}
        {activeTab === "workflow" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Workflow Configuration
                </CardTitle>
                <CardDescription>Configure submission and review workflows</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="review-timeout">Review Timeout (days)</Label>
                  <Input
                    id="review-timeout"
                    type="number"
                    value={settings.review_timeouts_days}
                    onChange={(e) =>
                      setSettings({ ...settings, review_timeouts_days: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Maximum time allowed for reviewer response before escalation
                  </p>
                </div>

                <div>
                  <Label htmlFor="escalation-email">Escalation Email</Label>
                  <Input
                    id="escalation-email"
                    type="email"
                    value={settings.escalation_email}
                    onChange={(e) => setSettings({ ...settings, escalation_email: e.target.value })}
                  />
                  <p className="text-xs text-slate-500 mt-1">Email address for workflow escalations</p>
                </div>

                <div>
                  <Label htmlFor="retention">File Retention Period (years)</Label>
                  <Input
                    id="retention"
                    type="number"
                    value={settings.file_retention_years}
                    onChange={(e) =>
                      setSettings({ ...settings, file_retention_years: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-slate-500 mt-1">Default retention period for archived documents</p>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={saveSettings} className="bg-cyan-500 hover:bg-cyan-600 w-full gap-2">
                    <Save className="w-4 h-4" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Role Permissions
                </CardTitle>
                <CardDescription>Overview of role-based access control</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Instructor</h4>
                    <p className="text-xs text-slate-600">Submit documents, track submissions, upload files</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">PC (Programme Coordinator)</h4>
                    <p className="text-xs text-slate-600">First-level review, approve or reject submissions</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">AMO (Academic Management)</h4>
                    <p className="text-xs text-slate-600">Final approval authority, complete submission review</p>
                  </div>

                  <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                    <h4 className="font-semibold text-sm mb-2 text-cyan-900">IM & Admin</h4>
                    <p className="text-xs text-cyan-800">
                      Secondary approval authority when primary reviewers unavailable
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Records Manager</h4>
                    <p className="text-xs text-slate-600">Archive documents, manage retention, download files</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "audit" && (
          <div>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter audit log entries</CardDescription>
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
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label>Action Type</Label>
                    <select
                      value={filters.action_type}
                      onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">All Actions</option>
                      <option value="created">Created</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={applyFilters} className="bg-cyan-500 hover:bg-cyan-600" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Apply Filters
                  </Button>
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Complete audit trail of system activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left font-semibold">Date & Time</th>
                        <th className="px-4 py-3 text-left font-semibold">User</th>
                        <th className="px-4 py-3 text-left font-semibold">Action</th>
                        <th className="px-4 py-3 text-left font-semibold">Submission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap text-xs">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{log.user.full_name}</div>
                            <div className="text-xs text-slate-500 uppercase">{log.user.role}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                log.action_type === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : log.action_type === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{log.submission.submission_id}</div>
                            <div className="text-xs text-slate-500">{log.submission.title}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>Configure email notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Enable Email Notifications</h4>
                    <p className="text-xs text-slate-600">Send email updates for submission status changes</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Review Reminders</h4>
                    <p className="text-xs text-slate-600">Remind reviewers of pending submissions</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Archive Notifications</h4>
                    <p className="text-xs text-slate-600">Notify when documents are archived</p>
                  </div>
                  <Switch />
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={saveSettings} className="bg-cyan-500 hover:bg-cyan-600 w-full gap-2">
                    <Save className="w-4 h-4" />
                    Save Notification Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Templates</CardTitle>
                <CardDescription>Email templates for automated notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Submission Received</h4>
                    <p className="text-xs text-slate-600">Sent to instructor when submission is received</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Review Required</h4>
                    <p className="text-xs text-slate-600">Sent to reviewers when action needed</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Approval Notification</h4>
                    <p className="text-xs text-slate-600">Sent when submission is approved</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-1">Rejection Notice</h4>
                    <p className="text-xs text-slate-600">Sent when submission is rejected with feedback</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Configure authentication and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Require Two-Factor Authentication</h4>
                    <p className="text-xs text-slate-600">Enforce 2FA for all admin accounts</p>
                  </div>
                  <Switch
                    checked={settings.require_two_factor}
                    onCheckedChange={(checked) => setSettings({ ...settings, require_two_factor: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Auto-Lock After Inactivity</h4>
                    <p className="text-xs text-slate-600">Automatically log out inactive users</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Audit Log Access</h4>
                    <p className="text-xs text-slate-600">Track who views audit logs</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={saveSettings} className="bg-cyan-500 hover:bg-cyan-600 w-full gap-2">
                    <Save className="w-4 h-4" />
                    Save Security Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Information</CardTitle>
                <CardDescription>Current security status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-1">All Systems Secure</h4>
                    <p className="text-sm text-green-800">No security issues detected</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">SSL Certificate</span>
                      <span className="font-medium text-green-600">Valid</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Database Encryption</span>
                      <span className="font-medium text-green-600">Enabled</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Backup Status</span>
                      <span className="font-medium text-green-600">Active</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Last Security Scan</span>
                      <span className="font-medium">2 hours ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}