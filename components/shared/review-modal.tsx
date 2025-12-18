"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, AlertTriangle, FileText, ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ReviewModalProps {
  submission: any
  stage: "pc" | "amo"
  onClose: () => void
  onSubmit: (decision: "approved" | "rejected", comments: string) => void
}

export default function ReviewModal({ submission, stage, onClose, onSubmit }: ReviewModalProps) {
  const supabase = createClient()

  const [decision, setDecision] = useState<"approved" | "rejected">("approved")
  const [comments, setComments] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Document view state
  const [docsLoading, setDocsLoading] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [docName, setDocName] = useState<string>("")
  const [docType, setDocType] = useState<"pdf" | "docx" | "other" | null>(null)

  if(!supabase) return;

  const submissionDocs = useMemo(() => {
    const arr = submission?.submission_documents
    return Array.isArray(arr) ? arr : []
  }, [submission?.submission_documents])

  const latestDoc = useMemo(() => {
    if (!submissionDocs.length) return null
    const sorted = [...submissionDocs].sort((a, b) => {
      const va = Number(a?.version ?? 0)
      const vb = Number(b?.version ?? 0)
      if (vb !== va) return vb - va
      const ta = new Date(a?.uploaded_at ?? 0).getTime()
      const tb = new Date(b?.uploaded_at ?? 0).getTime()
      return tb - ta
    })
    return sorted[0] ?? null
  }, [submissionDocs])

  const guessType = (fileName?: string, fileType?: string) => {
    const name = String(fileName || "").toLowerCase()
    const ft = String(fileType || "").toLowerCase()
    if (name.endsWith(".pdf") || ft.includes("pdf")) return "pdf"
    if (name.endsWith(".docx") || ft.includes("word") || ft.includes("officedocument.wordprocessingml")) return "docx"
    return "other"
  }

  // ✅ Build a signed URL
  useEffect(() => {
    let cancelled = false

    const loadDocLink = async () => {
      setDocError(null)
      setDocUrl(null)
      setDocName("")
      setDocType(null)

      if (!latestDoc?.file_path) return

      try {
        setDocsLoading(true)

        const { data, error } = await supabase.storage
          .from("submissions")
          .createSignedUrl(latestDoc.file_path, 60 * 10)

        if (error) throw error
        if (!data?.signedUrl) throw new Error("Could not generate document link")

        if (cancelled) return
        setDocUrl(data.signedUrl)
        setDocName(latestDoc.file_name || "Attached document")
        setDocType(guessType(latestDoc.file_name, latestDoc.file_type))
      } catch (e: any) {
        console.error("Failed to create doc link:", e)
        if (!cancelled) setDocError(e?.message || "Could not load document link.")
      } finally {
        if (!cancelled) setDocsLoading(false)
      }
    }

    loadDocLink()
    return () => {
      cancelled = true
    }
  }, [latestDoc?.file_path, latestDoc?.file_name, latestDoc?.file_type, supabase])

  // ✅ Open document using appropriate viewer
  const handleViewDocument = () => {
    if (!docUrl) return

    // PDF: open directly; browser/installed PDF viewer handles it
    if (docType === "pdf") {
      window.open(docUrl, "_blank", "noopener,noreferrer")
      return
    }

    // DOCX: use Office online viewer (best)
    if (docType === "docx") {
      const officeViewer = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(docUrl)}`
      window.open(officeViewer, "_blank", "noopener,noreferrer")
      return
    }

    // Other: fallback to opening raw URL
    window.open(docUrl, "_blank", "noopener,noreferrer")
  }

  // Optional: provide a Google viewer fallback link for DOCX (sometimes works, sometimes not)
  const googleViewerUrl =
    docUrl && docType === "docx"
      ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(docUrl)}`
      : null

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
            Submission ID: <span className="font-semibold text-slate-900">{submission?.id || "RFA-2024-001"}</span> |{" "}
            Submitted by: {submission?.instructor_name || "Dr. Eleanor Vance"}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* ✅ Document section */}
          <div className="space-y-2">
            <Label className="text-lg font-bold text-slate-900">Attached Document</Label>

            {!latestDoc ? (
              <div className="text-sm text-slate-600">No document attached to this submission.</div>
            ) : docsLoading ? (
              <div className="text-sm text-slate-600">Loading document link…</div>
            ) : docError ? (
              <div className="text-sm text-red-600">{docError}</div>
            ) : docUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <p className="text-sm font-medium text-slate-900 truncate">{docName}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {docType === "pdf" ? "PDF" : docType === "docx" ? "DOCX" : "File"} • v{latestDoc.version ?? 1}
                  </p>

                  {/* Optional fallback link for DOCX */}
                  {googleViewerUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(googleViewerUrl, "_blank", "noopener,noreferrer")}
                      className="mt-2 text-xs text-cyan-700 hover:underline"
                    >
                      Trouble opening? Try Google viewer
                    </button>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 bg-transparent"
                  onClick={handleViewDocument}
                >
                  <ExternalLink className="w-4 h-4" />
                  View
                </Button>
              </div>
            ) : (
              <div className="text-sm text-slate-600">Document link not available.</div>
            )}
          </div>

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
