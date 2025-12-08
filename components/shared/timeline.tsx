"use client"

import { Card } from "@/components/ui/card"
import { Clock, CheckCircle, XCircle, Archive, Mail } from "lucide-react"

interface TimelineEvent {
  id: string
  type: "submitted" | "pc_review" | "amo_review" | "email_sent" | "final_archived"
  actor: string
  role: string
  timestamp: string
  decision?: "approved" | "rejected"
  comments?: string
  metadata?: Record<string, any>
}

interface TimelineProps {
  events: TimelineEvent[]
}

const EVENT_ICONS = {
  submitted: Clock,
  pc_review: CheckCircle,
  amo_review: CheckCircle,
  email_sent: Mail,
  final_archived: Archive,
}

const EVENT_LABELS = {
  submitted: "Document Submitted",
  pc_review: "PC Review",
  amo_review: "AMO Review",
  email_sent: "Email Notification Sent",
  final_archived: "Document Archived",
}

export default function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return <Card className="p-6 text-center text-muted-foreground">No events yet</Card>
  }

  return (
    <div className="space-y-6">
      {events.map((event, index) => {
        const IconComponent = EVENT_ICONS[event.type]
        const isRejected = event.decision === "rejected"

        return (
          <div key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full ${isRejected ? "bg-red-100" : "bg-blue-100"}`}>
                {isRejected ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <IconComponent className="w-5 h-5 text-blue-600" />
                )}
              </div>
              {index < events.length - 1 && <div className="w-1 h-16 bg-border mt-2" />}
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{EVENT_LABELS[event.type]}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.actor} ({event.role})
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>

              {event.decision && (
                <div className="mt-2">
                  <span
                    className={`text-sm font-medium ${event.decision === "approved" ? "text-green-600" : "text-red-600"}`}
                  >
                    {event.decision === "approved" ? "✓ Approved" : "✕ Rejected"}
                  </span>
                </div>
              )}

              {event.comments && <p className="mt-2 text-sm text-foreground bg-muted p-3 rounded">{event.comments}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
