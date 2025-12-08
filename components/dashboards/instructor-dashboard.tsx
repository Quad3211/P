"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Bell } from "lucide-react"
import SubmissionForm from "@/components/forms/submission-form"
import SubmissionDetail from "@/components/shared/submission-detail"
import { getSubmissions } from "@/lib/api"

interface Submission {
  id: string
  submission_id: string
  title: string
  skill_area: string
  cohort: string
  test_date: string
  status: string
  updated_at: string
  instructor_name: string
}

interface InstructorDashboardProps {
  userName: string
}

export default function InstructorDashboard({ userName }: InstructorDashboardProps) {
  const [view, setView] = useState<"dashboard" | "new" | "detail">("dashboard")
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data = await getSubmissions()
        setSubmissions(data)
      } catch (error) {
        console.error("Failed to fetch submissions:", error)
      } finally {
        setLoading(false)
      }
    }

    if (view === "dashboard") {
      fetchSubmissions()
    }
  }, [view])

  const filteredSubmissions = submissions.filter(
    (sub) =>
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.submission_id.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const stats = {
    drafts: submissions.filter((s) => s.status === "draft").length,
    pending: submissions.filter((s) => ["submitted", "pc_review", "amo_review"].includes(s.status)).length,
    approved: submissions.filter((s) => s.status === "approved").length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "submitted":
      case "pc_review":
      case "amo_review":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "draft":
        return "bg-slate-100 text-slate-800"
      case "archived":
        return "bg-slate-200 text-slate-700"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pc_review: "In Review",
      amo_review: "AMO Review",
    }
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (view === "new") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button variant="outline" onClick={() => setView("dashboard")} className="text-slate-600">
              ← Back to Dashboard
            </Button>
          </div>
          <SubmissionForm
            onSubmit={() => {
              setView("dashboard")
            }}
          />
        </div>
      </div>
    )
  }

  if (view === "detail" && selectedSubmission) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => {
                setView("dashboard")
                setSelectedSubmission(null)
              }}
              className="text-slate-600"
            >
              ← Back to Submissions
            </Button>
          </div>
          <SubmissionDetail submission={selectedSubmission as any} onBack={() => setView("dashboard")} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600">Welcome back, here's an overview of your recent activity.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <Button onClick={() => setView("new")} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Start New RFA Submission
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">My Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900">{stats.drafts}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900">{stats.approved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions Table */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-xl font-bold text-slate-900">My Submissions</CardTitle>
              <Input
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-xs border-slate-300"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-600">Loading submissions...</div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-slate-600">No submissions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">SUBMISSION ID</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">TITLE</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">LAST UPDATED</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">STATUS</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((submission) => (
                      <tr key={submission.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-cyan-600">{submission.submission_id}</td>
                        <td className="px-6 py-4 text-slate-900 font-medium">{submission.title}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(submission.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              submission.status,
                            )}`}
                          >
                            {getStatusLabel(submission.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSubmission(submission)
                              setView("detail")
                            }}
                            className="text-cyan-600 hover:text-cyan-700"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
