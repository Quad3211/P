"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import Link from "next/link"
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

export default function DashboardPage() {
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

    fetchSubmissions()
  }, [])

  const stats = {
    drafts: submissions.filter((s) => s.status === "draft").length,
    pending: submissions.filter((s) => ["submitted", "pc_review", "amo_review"].includes(s.status)).length,
    approved: submissions.filter((s) => s.status === "approved").length,
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
          <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white">
            <Link href="/dashboard/submissions/new" className="gap-2">
              <Plus className="w-4 h-4" />
              Start New Submission
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">My Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900">{stats.drafts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900">{stats.approved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-600">Loading...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8 text-slate-600">No submissions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">ID</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">TITLE</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">STATUS</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-700">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.slice(0, 5).map((submission) => (
                      <tr key={submission.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-cyan-600">{submission.submission_id}</td>
                        <td className="px-6 py-4 text-slate-900">{submission.title}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            {submission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/submissions/${submission.id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium"
                          >
                            View
                          </Link>
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
