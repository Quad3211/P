"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import SubmissionDetail from "@/components/shared/submission-detail"
import { AlertCircle, CheckCircle, Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Submission {
  id: string
  submission_id: string
  title: string
  skill_area: string
  cohort: string
  status: string
  instructor_name: string
  instructor_email: string
  created_at: string
  updated_at: string
  test_date: string
  description?: string
}

interface IMDashboardProps {
  userName: string
}

export default function IMDashboard({ userName }: IMDashboardProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "pending">("overview")

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        if (!supabase) {
          console.error('Supabase client not initialized')
          return
        }

        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching submissions:', error)
          return
        }

        setSubmissions(data as Submission[] || [])
      } catch (error) {
        console.error('Failed to fetch submissions:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!selectedSubmission) {
      fetchSubmissions()
    }
  }, [selectedSubmission])

  const pendingForSecondary = submissions.filter(
    (s) => s.status === "submitted" || s.status === "amo_review"
  )

  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => ["submitted", "pc_review", "amo_review"].includes(s.status)).length,
    approved: submissions.filter((s) => s.status === "approved").length,
    requiresSecondary: pendingForSecondary.length,
  }

  if (selectedSubmission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setSelectedSubmission(null)}
          className="mb-6 text-slate-600"
        >
          ← Back to Dashboard
        </Button>
        <SubmissionDetail 
          submission={selectedSubmission} 
          onBack={() => setSelectedSubmission(null)} 
          reviewerRole="im"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">IM Dashboard</h1>
          <p className="text-slate-600">Institution Manager & Secondary Approval Authority</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm border-2 border-cyan-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-cyan-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Secondary Review Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-cyan-600">{stats.requiresSecondary}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab("overview")}
            className={activeTab === "overview" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
          >
            <Eye className="w-4 h-4 mr-2" />
            All Submissions
          </Button>
          <Button
            variant={activeTab === "pending" ? "default" : "outline"}
            onClick={() => setActiveTab("pending")}
            className={activeTab === "pending" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Requires Secondary Review ({stats.requiresSecondary})
          </Button>
        </div>

        {/* Alert Box */}
        {activeTab === "pending" && pendingForSecondary.length > 0 && (
          <div className="mb-6 bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-cyan-900">Secondary Approval Authority</p>
                <p className="text-sm text-cyan-800 mt-1">
                  As IM, you have the authority to approve or reject submissions when the AMO is unavailable. 
                  Your review will be logged as a secondary approval in the audit trail.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submissions List */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">
                  {activeTab === "overview" ? "All Submissions" : "Submissions Requiring Secondary Review"}
                </CardTitle>
                <CardDescription className="mt-1">
                  {activeTab === "overview"
                    ? `${submissions.length} total submission${submissions.length !== 1 ? "s" : ""}`
                    : `${pendingForSecondary.length} submission${pendingForSecondary.length !== 1 ? "s" : ""} awaiting decision`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : (activeTab === "overview" ? submissions : pendingForSecondary).length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">
                  {activeTab === "overview" ? "No submissions yet" : "No submissions requiring secondary review"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(activeTab === "overview" ? submissions : pendingForSecondary).map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-all"
                  >
                    <div className="flex-1">
                      <button
                        onClick={() => setSelectedSubmission(submission)}
                        className="text-base font-semibold text-slate-900 hover:text-cyan-600 transition-colors text-left"
                      >
                        {submission.submission_id}: {submission.title}
                      </button>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span>{submission.skill_area}</span>
                        <span>•</span>
                        <span>{submission.cohort}</span>
                        <span>•</span>
                        <span>by {submission.instructor_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          className={
                            submission.status === "approved"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : submission.status === "rejected"
                                ? "bg-red-100 text-red-800 hover:bg-red-100"
                                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          }
                        >
                          {submission.status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                        {(submission.status === "submitted" || submission.status === "amo_review") && (
                          <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">
                            Secondary Review Available
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Last updated: {new Date(submission.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedSubmission(submission)}
                      variant={activeTab === "pending" ? "default" : "outline"}
                      className={activeTab === "pending" ? "bg-cyan-500 hover:bg-cyan-600 text-white font-semibold ml-4" : "ml-4"}
                    >
                      {activeTab === "pending" ? "Review & Decide" : "View"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}