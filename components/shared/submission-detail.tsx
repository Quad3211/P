"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, AlertCircle } from "lucide-react"
import StatusBadge from "./status-badge"
import ReviewModal from "./review-modal"
import { useState, useEffect } from "react"
import { getSubmission } from "@/lib/api"
import { createClient } from "@/lib/supabase/client"

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
  reviewerRole?: "pc" | "amo" | "im" | "admin"
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
  const [userRole, setUserRole] = useState<string>("")
  const supabase = createClient()

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        if (profile) {
          setUserRole(profile.role)
        }
      }
    }
    fetchUserRole()
  }, [supabase])

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

  // Determine if user can review
  const isSecondaryApprover = ["im", "admin"].includes(userRole)
  const isPrimaryReviewer = reviewerRole && userRole === reviewerRole
  const canReview = (isPrimaryReviewer || isSecondaryApprover) && !viewOnly

  // Determine if secondary review is appropriate
  const needsSecondaryReview = 
    isSecondaryApprover && 
    (submission.status === "submitted" || submission.status === "amo_review")

  const latestDoc = submission.submission_documents?.[0]

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {/* Secondary Approver Alert */}
      {needsSecondaryReview && !viewOnly && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-cyan-900">Secondary Approval Authority</p>
              <p className="text-sm text-cyan-800 mt-1">
                You are authorized to approve or reject this submission as a secondary approver ({userRole.toUpperCase()}).
                Your decision will be recorded in the audit trail as a secondary review.
              </p>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex flex-col gap-2">
                  <StatusBadge status={submission.status} />
                  {needsSecondaryReview && (
                    <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs font-semibold rounded">
                      Secondary Review Available
                    </span>
                  )}
                </div>
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

              <div className="grid gap-2 text-sm text-muted-foreground pt-4 border-t">
                <div>Submitted: {new Date(submission.created_at).toLocaleString()}</div>
                <div>Last Updated: {new Date(submission.updated_at).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {canReview && (
            <Card className="border-2 border-cyan-200">
              <CardHeader>
                <CardTitle className="text-lg">Review Actions</CardTitle>
                {needsSecondaryReview && (
                  <CardDescription className="text-cyan-600 font-medium">
                    Secondary Approver
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowReviewModal(true)} 
                  className="w-full bg-cyan-500 hover:bg-cyan-600" 
                  disabled={loading}
                >
                  {needsSecondaryReview 
                    ? "Secondary Review & Decide" 
                    : reviewerRole === "pc" 
                      ? "Review & Decide" 
                      : "Final Decision"}
                </Button>
                {needsSecondaryReview && (
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Your review will be logged as secondary approval
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full gap-2" disabled={!latestDoc}>
                <Download className="w-4 h-4" />
                Download Document
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showReviewModal && (
        <ReviewModal
          submission={submission}
          stage={needsSecondaryReview ? "secondary" : (reviewerRole === "pc" ? "pc" : "amo")}
          onClose={() => setShowReviewModal(false)}
          onSubmit={async (decision, comments) => {
            setLoading(true)
            try {
              const response = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  submission_id: submission.id,
                  reviewer_role: reviewerRole || userRole,
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