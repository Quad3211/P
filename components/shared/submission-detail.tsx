"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, AlertCircle, Award, Lock } from "lucide-react"
import ReviewModal from "./review-modal"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface SubmissionDocument {
  id: string
  file_name: string
  file_path: string
  version: number
  uploaded_at: string
}

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
  submission_documents?: SubmissionDocument[]
}

interface SubmissionDetailProps {
  submission: Submission
  onBack: () => void
  reviewerRole?: "pc" | "amo" | "institution_manager" | "administrator"
  viewOnly?: boolean
}

const getStatusBadgeColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-800",
    submitted: "bg-blue-100 text-blue-800",
    pc_review: "bg-yellow-100 text-yellow-800",
    amo_review: "bg-orange-100 text-orange-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    archived: "bg-purple-100 text-purple-800",
  }
  return colors[status] || "bg-slate-100 text-slate-800"
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pc_review: "In PC Review",
    amo_review: "In AMO Review",
  }
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
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

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const supabase = createClient()
        if (!supabase) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        if (profile) {
          setUserRole(profile.role)
        }
      } catch (error) {
        console.error("Error fetching user role:", error)
      }
    }

    fetchUserRole()
  }, [])

  useEffect(() => {
    const fetchSubmissionDetails = async () => {
      if (submission.submission_documents && submission.submission_documents.length > 0) {
        return
      }

      try {
        const supabase = createClient()
        if (!supabase) return

        const { data, error } = await supabase
          .from("submissions")
          .select(`
            *,
            submission_documents(*)
          `)
          .eq("id", submission.id)
          .single()

        if (error) {
          console.error("Error fetching submission details:", error)
          return
        }

        if (data) {
          setSubmission(data as Submission)
        }
      } catch (error) {
        console.error("Failed to fetch submission details:", error)
      }
    }

    fetchSubmissionDetails()
  }, [submission.id, submission.submission_documents])

  const isSecondaryApprover = ["institution_manager", "administrator", "senior_instructor"].includes(userRole)
  const isPrimaryReviewer = reviewerRole && userRole === reviewerRole
  const canReview = (isPrimaryReviewer || isSecondaryApprover) && !viewOnly

  // ✅ CRITICAL: Only Records Manager can download
  const canDownload = userRole === "records"

  let reviewType = "primary"
  let reviewStage = ""
  let canProvideSecondaryApproval = false

  if (isSecondaryApprover && !isPrimaryReviewer) {
    reviewType = "secondary"
    
    if (userRole === "senior_instructor" && submission.status === "submitted") {
      canProvideSecondaryApproval = true
      reviewStage = "pc"
    }
    else if (["institution_manager", "administrator"].includes(userRole)) {
      if (submission.status === "submitted") {
        canProvideSecondaryApproval = true
        reviewStage = "pc"
      } else if (submission.status === "amo_review") {
        canProvideSecondaryApproval = true
        reviewStage = "amo"
      }
    }
  } else if (isPrimaryReviewer) {
    reviewStage = reviewerRole || ""
    canProvideSecondaryApproval = true
  }

  const latestDoc = submission.submission_documents?.[0]

  const handleDownload = async () => {
    if (!canDownload) {
      alert("Only Records Managers can download submission files.")
      return
    }

    if (!latestDoc) return

    try {
      const supabase = createClient()
      if (!supabase) {
        console.error('Supabase client not initialized')
        return
      }

      const { data, error } = await supabase.storage
        .from('submissions')
        .download(latestDoc.file_path)

      if (error) {
        console.error('Download error:', error)
        return
      }

      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = latestDoc.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download:', error)
    }
  }

  const handleReviewSubmit = async (decision: "approved" | "rejected", comments: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submission.id,
          reviewer_role: reviewStage,
          status: decision,
          comments,
        }),
      })

      if (response.ok) {
        setShowReviewModal(false)
        onBack()
      } else {
        const error = await response.json()
        console.error("Review submission failed:", error)
      }
    } catch (error) {
      console.error("Review submission failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {userRole === "senior_instructor" && submission.status === "submitted" && !viewOnly && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Award className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-900">Senior Instructor Authority</p>
              <p className="text-sm text-purple-800 mt-1">
                As a Senior Instructor, you are authorized to provide secondary approval for this PC review.
                Your decision will be recorded in the audit trail as a secondary review.
              </p>
            </div>
          </div>
        </div>
      )}

      {["institution_manager", "administrator"].includes(userRole) && canProvideSecondaryApproval && !isPrimaryReviewer && !viewOnly && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-cyan-900">Secondary Approval Authority</p>
              <p className="text-sm text-cyan-800 mt-1">
                You are authorized to approve or reject this submission as a secondary approver ({userRole === "institution_manager" ? "Institution Manager" : "Administrator"}) for the {reviewStage.toUpperCase()} stage.
                Your decision will be recorded in the audit trail as a secondary review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Show info banner for non-records users */}
      {!canDownload && latestDoc && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Download Restricted</p>
              <p className="text-sm text-amber-800 mt-1">
                Only Records Managers can download submission files. This restriction ensures proper document control and audit trails.
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
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(submission.status)}`}>
                    {getStatusLabel(submission.status)}
                  </span>
                  {canProvideSecondaryApproval && reviewType === "secondary" && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded text-center">
                      {userRole === "senior_instructor" ? "Senior Instructor" : userRole === "institution_manager" ? "Institution Manager" : "Administrator"}
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
                    {/* ✅ Show lock icon instead of download for non-records users */}
                    {latestDoc && !canDownload && (
                      <Lock className="w-4 h-4 text-amber-500" />
                    )}
                    {latestDoc && canDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={handleDownload}
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
          {canReview && canProvideSecondaryApproval && (
            <Card className={`border-2 ${reviewType === "secondary" && userRole === "senior_instructor" ? "border-purple-200" : "border-cyan-200"}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {reviewType === "secondary" && userRole === "senior_instructor" && (
                    <Award className="w-4 h-4 text-purple-600" />
                  )}
                  Review Actions
                </CardTitle>
                {reviewType === "secondary" && (
                  <CardDescription className={userRole === "senior_instructor" ? "text-purple-600 font-medium" : "text-cyan-600 font-medium"}>
                    {userRole === "senior_instructor" ? "Senior Instructor" : userRole === "institution_manager" ? "Institution Manager" : "Administrator"} ({reviewStage.toUpperCase()})
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowReviewModal(true)} 
                  className={`w-full ${userRole === "senior_instructor" ? "bg-purple-500 hover:bg-purple-600" : "bg-cyan-500 hover:bg-cyan-600"}`}
                  disabled={loading}
                >
                  {reviewType === "secondary" 
                    ? "Secondary Review & Decide" 
                    : reviewStage === "pc" 
                      ? "Review & Decide" 
                      : "Final Decision"}
                </Button>
                {reviewType === "secondary" && (
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
              {canDownload ? (
                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  disabled={!latestDoc}
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" />
                  Download Document
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 opacity-50 cursor-not-allowed" 
                    disabled={true}
                  >
                    <Lock className="w-4 h-4" />
                    Download Restricted
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Only Records Managers can download files
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showReviewModal && (
        <ReviewModal
          submission={submission}
          stage={reviewStage === "pc" ? "pc" : "amo"}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
        />
      )}
    </div>
  )
}