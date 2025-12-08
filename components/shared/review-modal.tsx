"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, AlertTriangle } from "lucide-react"

interface ReviewModalProps {
  submission: any
  stage: "pc" | "amo"
  onClose: () => void
  onSubmit: (decision: "approved" | "rejected", comments: string) => void
}

export default function ReviewModal({ submission, stage, onClose, onSubmit }: ReviewModalProps) {
  const [decision, setDecision] = useState<"approved" | "rejected">("approved")
  const [comments, setComments] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSubmitting(false)
    onSubmit(decision, comments)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
          <CardTitle className="text-2xl text-slate-900">
            {stage === "pc" ? "Module Skills Assessment - Cohort B" : "AMO Final Review"}
          </CardTitle>
          <CardDescription className="mt-2">
            Submission ID: <span className="font-semibold text-slate-900">{submission.id || "RFA-2024-001"}</span> |
            Submitted by: {submission.instructor_name || "Dr. Eleanor Vance"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reviewer Actions */}
            <div className="space-y-4">
              <Label className="text-lg font-bold text-slate-900">Reviewer Actions</Label>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setDecision("approved")}
                  className={`flex-1 h-12 font-semibold text-base transition-all ${
                    decision === "approved"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                  }`}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Approve
                </Button>
                <Button
                  type="button"
                  onClick={() => setDecision("rejected")}
                  className={`flex-1 h-12 font-semibold text-base transition-all ${
                    decision === "rejected"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Reject
                </Button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-3">
              <Label htmlFor="comments" className="text-base font-semibold text-slate-900">
                {decision === "rejected" ? "Reviewer Notes (required for rejection)" : "Reviewer Notes"}
              </Label>
              <Textarea
                id="comments"
                placeholder="Add comments for the instructor..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="border-slate-300 text-slate-900 placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Info Boxes */}
            <div className="space-y-3">
              {decision === "approved" ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900">
                        Approving will send this submission to the AMO for final review.
                      </p>
                      <p className="text-sm text-blue-800 mt-1">This action cannot be undone.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">
                        Rejecting will return this to the instructor with your comments.
                      </p>
                      <p className="text-sm text-orange-800 mt-1">Ensure your feedback is clear and actionable.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-slate-700 hover:bg-slate-50 bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (decision === "rejected" && !comments.trim())}
                className={`font-semibold h-10 px-6 ${
                  decision === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                } text-white`}
              >
                {isSubmitting ? "Submitting..." : decision === "approved" ? "Approve" : "Reject"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
