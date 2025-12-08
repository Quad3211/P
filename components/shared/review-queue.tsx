"use client"
import { ChevronRight } from "lucide-react"

interface Submission {
  id: string
  skill_group: string
  cluster: string
  reference_code: string
  instructor_name: string
  status: "submitted" | "pc_approved" | "amo_approved"
  created_at: string
}

interface ReviewQueueProps {
  submissions: Submission[]
  onSelectSubmission: (submission: Submission) => void
  stage: "pc" | "amo"
}

export default function ReviewQueue({ submissions, onSelectSubmission, stage }: ReviewQueueProps) {
  return (
    <div className="space-y-3">
      {submissions.map((submission, index) => (
        <button
          key={submission.id}
          onClick={() => onSelectSubmission(submission)}
          className="w-full text-left p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors flex items-start justify-between gap-4 group"
        >
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{submission.reference_code}</p>
              <p className="text-sm text-muted-foreground mt-1">{submission.skill_group}</p>
              <p className="text-sm text-muted-foreground">From: {submission.instructor_name}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Submitted {new Date(submission.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-medium bg-amber-100 text-amber-900 px-2 py-1 rounded">
              Pending {stage.toUpperCase()}
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      ))}
    </div>
  )
}
