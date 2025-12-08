"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download } from "lucide-react"
import StatusBadge from "./status-badge"
import ReviewModal from "./review-modal"
import { useState, useEffect } from "react"
import { getSubmission } from "@/lib/api"

interface Submission {
  id: string
  submission_id: string
  title: string
  skill_area: string
  cohort: string
  test_date: string
  status: string
  instructor_name: string
  instructor_email: string
  description?: string
  created_at: string
  updated_at: string
  submission_documents?: any[]
}

interface SubmissionDetailProps {
  submission: Submission
  onBack: () => void
  reviewerRole?: "pc" | "amo"
  viewOnly?: boolean
}

export default function SubmissionDetail({
  submission: initialSubmission,
  onBack,
  reviewerRole,
  viewOnly,
}: SubmissionDetailProps) {
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [submission, setSubmission] = useState(initialSubmission)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!submission.title) {
      const fetchSubmission = async () => {
        try {
          const data = await getSubmission(submission.id)
          setSubmission(data)
        } catch (error) {
          console.error("Failed to fetch submission:", error)
        }
      }
      fetchSubmission()
    }
  }, [submission.id, submission.title])

  const canReview = reviewerRole && !viewOnly
  const latestDoc = submission.submission_documents?.[0]

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{submission.submission_id}</CardTitle>
                  <CardDescription className="mt-2">{submission.title}</CardDescription>
                </div>
                <StatusBadge status={submission.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Skill Area</p>
                  <p className="font-medium text-foreground">{submission.skill_area}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cohort</p>
                  <p className="font-medium text-foreground">{submission.cohort}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Test Date</p>
                  <p className="font-medium text-foreground">{new Date(submission.test_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Latest Document</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-sm truncate">
                      {latestDoc?.file_name || "No documents"}
                    </p>
                    {latestDoc && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => console.log("Download:", latestDoc.file_name)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {submission.instructor_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Instructor</p>
                  <p className="font-medium text-foreground">{submission.instructor_name}</p>
                  <p className="text-sm text-muted-foreground">{submission.instructor_email}</p>
                </div>
              )}

              {submission.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-foreground bg-muted p-3 rounded mt-2">{submission.description}</p>
                </div>
              )}

              <div className="grid gap-2 text-sm text-muted-foreground">
                <div>Submitted: {new Date(submission.created_at).toLocaleString()}</div>
                <div>Updated: {new Date(submission.updated_at).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {canReview && (
            <Button onClick={() => setShowReviewModal(true)} className="w-full" disabled={loading}>
              {reviewerRole === "pc" ? "Review & Decide" : "Final Decision"}
            </Button>
          )}
        </div>
      </div>

      {showReviewModal && (
        <ReviewModal
          submission={submission}
          stage={reviewerRole === "pc" ? "pc" : "amo"}
          onClose={() => setShowReviewModal(false)}
          onSubmit={async (decision, comments) => {
            setLoading(true)
            try {
              const response = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  submission_id: submission.id,
                  reviewer_role: reviewerRole,
                  status: decision,
                  comments,
                }),
              })

              if (response.ok) {
                setShowReviewModal(false)
                onBack()
              }
            } catch (error) {
              console.error("Review submission failed:", error)
            } finally {
              setLoading(false)
            }
          }}
        />
      )}
    </div>
  )
}
