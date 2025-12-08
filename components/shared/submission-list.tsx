"use client"

import StatusBadge from "./status-badge"
import { ChevronRight } from "lucide-react"

interface Submission {
  id: string
  skill_group: string
  cluster: string
  reference_code: string
  instructor_name?: string
  status: "submitted" | "pc_approved" | "pc_rejected" | "amo_approved" | "amo_rejected" | "final_archived"
  created_at: string
  updated_at: string
}

interface SubmissionListProps {
  submissions: Submission[]
  onSelectSubmission: (submission: Submission) => void
  showInstructor?: boolean
}

export default function SubmissionList({ submissions, onSelectSubmission, showInstructor }: SubmissionListProps) {
  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <button
          key={submission.id}
          onClick={() => onSelectSubmission(submission)}
          className="w-full text-left p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors flex items-start justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{submission.reference_code}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {submission.skill_group} — {submission.cluster}
            </p>
            {showInstructor && (
              <p className="text-sm text-muted-foreground">Instructor: {submission.instructor_name}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">{new Date(submission.created_at).toLocaleDateString()}</p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={submission.status} />
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </button>
      ))}
    </div>
  )
}
