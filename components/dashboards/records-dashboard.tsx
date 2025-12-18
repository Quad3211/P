"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Settings } from "lucide-react"
import SubmissionDetail from "@/components/shared/submission-detail"
import Link from "next/link"
import { getSubmissions } from "@/lib/api"

interface Submission {
  id: string
  submission_id: string
  title: string
  skill_area: string
  cohort: string
  status: string
  instructor_name: string
  updated_at: string
}

interface RecordsDashboardProps {
  userName: string
}

export default function RecordsDashboard({ userName }: RecordsDashboardProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data:any = await getSubmissions("approved")
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

  const handleDownload = async (submission: Submission) => {
    try {
      const response = await fetch(`/api/submissions/${submission.id}/documents`)
      if (response.ok) {
        const docs = await response.json()
        if (docs.length > 0) {
          // In production, generate a download link from Supabase storage
          console.log("Downloading:", docs[0].file_name)
        }
      }
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  if (selectedSubmission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => setSelectedSubmission(null)} className="mb-6 text-slate-600">
          ← Back to Records
        </Button>
        <SubmissionDetail submission={selectedSubmission} onBack={() => setSelectedSubmission(null)} viewOnly />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Records & Archive</h1>
            <p className="text-slate-600">Download and manage approved documents</p>
          </div>
          <Link href="/settings">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Settings className="w-4 h-4" />
              Settings & Audit
            </Button>
          </Link>
        </div>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">Approved Documents</CardTitle>
            <CardDescription>
              {submissions.length} document{submissions.length !== 1 ? "s" : ""} ready for download
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : submissions.length === 0 ? (
              <p className="text-center py-8 text-slate-600">No approved documents yet</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <button
                        onClick={() => setSelectedSubmission(submission)}
                        className="text-base font-semibold text-cyan-600 hover:text-cyan-700 text-left"
                      >
                        {submission.submission_id}: {submission.title}
                      </button>
                      <p className="text-sm text-slate-600 mt-1">{submission.skill_area}</p>
                      <p className="text-sm text-slate-600">Instructor: {submission.instructor_name}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        Approved: {new Date(submission.updated_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleDownload(submission)} className="gap-2">
                        <Download className="w-4 h-4" />
                        <span className="hidden md:inline">Download</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(submission)}>
                        View
                      </Button>
                    </div>
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
