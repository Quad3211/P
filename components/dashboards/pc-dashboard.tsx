"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import SubmissionDetail from "@/components/shared/submission-detail"
import { CheckCircle } from "lucide-react"
import { getSubmissions } from "@/lib/api"

interface Submission {
  id: string
  submission_id: string
  title: string
  skill_area: string
  cohort: string
  test_date: string
  instructor_name: string
  status: string
  created_at: string
}

interface PCDashboardProps {
  userName: string
}

export default function PCDashboard({ userName }: PCDashboardProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data = await getSubmissions("submitted")
        setSubmissions(data)
      } catch (error) {
        console.error("Failed to fetch submissions:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!selectedSubmission) {
      fetchSubmissions()
    }
  }, [selectedSubmission])

  const handleBackFromDetail = () => {
    setSelectedSubmission(null)
  }

  if (selectedSubmission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={handleBackFromDetail} className="mb-6 text-slate-600">
          ← Back to Reviews
        </Button>
        <SubmissionDetail submission={selectedSubmission as any} onBack={handleBackFromDetail} reviewerRole="pc" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Programme Committee Review</h1>
          <p className="text-slate-600">Review and approve/reject incoming submissions</p>
        </div>

        {/* Queue Section */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Pending Reviews</CardTitle>
                <CardDescription className="mt-1">
                  {submissions.length} submission{submissions.length !== 1 ? "s" : ""} awaiting your review
                </CardDescription>
              </div>
              {submissions.length > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                  {submissions.length} Pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">All caught up!</p>
                <p className="text-slate-500 text-sm mt-1">No pending submissions to review</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-all group"
                  >
                    <div className="flex-1">
                      <button
                        onClick={() => setSelectedSubmission(submission)}
                        className="text-base font-semibold text-slate-900 hover:text-cyan-600 transition-colors text-left"
                      >
                        {submission.title}
                      </button>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span>{submission.skill_area}</span>
                        <span>•</span>
                        <span>{submission.cohort}</span>
                        <span>•</span>
                        <span>by {submission.instructor_name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Submitted {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => setSelectedSubmission(submission)}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold ml-4"
                    >
                      Review
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
