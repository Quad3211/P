"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import SubmissionDetail from "@/components/shared/submission-detail"
import { getSubmissionDoc, getSubmissions, uploadDocument } from "@/lib/api"
import { createClient } from "@/lib/supabase/client"

type SubmissionDocument = {
  id: string
  submission_id: string
  file_name: string
  file_path: string
  file_size?: number | null
  file_type?: string | null
  version: number
  uploaded_by: string
  uploaded_at: string
}

type ReviewRow = {
  id: string
  submission_id: string
  reviewer_role: "pc" | "amo"
  status: "pending" | "approved" | "rejected" | "reassigned"
  comments: string | null
  reviewed_at: string | null
  updated_at: string | null
  created_at: string | null
}

type DecisionInfo = {
  label: string
  color: string
  isRejected: boolean
  reason: string | null
  role: "pc" | "amo" | null
  at: string | null
}

export default function SubmissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [submission, setSubmission] = useState<any>(null)
  const [latestDoc, setLatestDoc] = useState<SubmissionDocument | null>(null)

  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const [userRole, setUserRole] = useState<string>("")

  // ✅ Review decision (drives status pill + rejection reason)
  const [decision, setDecision] = useState<DecisionInfo | null>(null)
  const [decisionLoading, setDecisionLoading] = useState(false)

  if (!supabase) return null;

  // ✅ Fetch user role from public.profiles
  useEffect(() => {
    const fetchRole = async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) {
        console.error("Failed to fetch user:", userErr)
        return
      }

      const userId = userData?.user?.id
      if (!userId) return

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      if (profileErr) {
        console.error("Failed to fetch profile role:", profileErr)
        return
      }

      setUserRole((profile?.role || "").toLowerCase())
    }

    fetchRole()
  }, [supabase])

  // ✅ Fetch submission + latest document
  useEffect(() => {
    const fetchSubmissionAndDoc = async () => {
      try {
        const data: any = await getSubmissions()
        const found = data.find((s: any) => String(s.id) === String(params.id))

        if (!found) {
          setSubmission(null)
          return
        }

        setSubmission(found)

        const { data: docs, error: docsErr } = await supabase
          .from("submission_documents")
          .select("id, submission_id, file_name, file_path, file_size, file_type, version, uploaded_by, uploaded_at")
          .eq("submission_id", found.id)
          .order("version", { ascending: false })
          .order("uploaded_at", { ascending: false })
          .limit(1)

        if (docsErr) {
          console.error("Failed to fetch submission documents:", docsErr)
          setLatestDoc(null)
        } else {
          setLatestDoc(docs?.[0] ?? null)
        }
      } catch (error) {
        console.error("Failed to fetch submission:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubmissionAndDoc()
  }, [params.id, supabase])

  // ✅ Fetch reviews and compute the status pill + rejection reason
  useEffect(() => {
    const fetchDecision = async () => {
      if (!submission?.id) return

      try {
        setDecisionLoading(true)

        const { data, error } = await supabase
          .from("reviews")
          .select("id, submission_id, reviewer_role, status, comments, reviewed_at, updated_at, created_at")
          .eq("submission_id", submission.id)
          .in("reviewer_role", ["pc", "amo"])

        if (error) throw error

        const rows: ReviewRow[] = (data || []) as any

        const pc = rows.find((r) => r.reviewer_role === "pc") || null
        const amo = rows.find((r) => r.reviewer_role === "amo") || null

        const isDecision = (r: ReviewRow | null) =>
          !!r && (r.status === "approved" || r.status === "rejected")

        // ✅ Prefer AMO decision if it exists; else PC decision
        const chosen: ReviewRow | null = isDecision(amo) ? amo : isDecision(pc) ? pc : amo || pc

        // Default fallback based on submission.status
        const subStatus = String(submission.status || "").toLowerCase()

        // If we have a chosen review, derive label from it
        if (chosen) {
          const roleLabel = chosen.reviewer_role.toUpperCase()
          const at = chosen.reviewed_at || chosen.updated_at || chosen.created_at || null

          if (chosen.status === "rejected") {
            setDecision({
              label: `Rejected by ${roleLabel}`,
              color: "bg-red-100 text-red-900",
              isRejected: true,
              reason: chosen.comments?.trim() || "No rejection reason provided.",
              role: chosen.reviewer_role,
              at,
            })
            return
          }

          if (chosen.status === "approved") {
            setDecision({
              label: `Approved by ${roleLabel}`,
              color:
                chosen.reviewer_role === "amo"
                  ? "bg-green-100 text-green-900"
                  : "bg-amber-100 text-amber-900",
              isRejected: false,
              reason: null,
              role: chosen.reviewer_role,
              at,
            })
            return
          }

          // pending / reassigned
          setDecision({
            label: `${roleLabel} Pending`,
            color: "bg-yellow-100 text-yellow-800",
            isRejected: false,
            reason: null,
            role: chosen.reviewer_role,
            at,
          })
          return
        }

        // ✅ No reviews found: map from submission.status
        if (subStatus === "submitted") {
          setDecision({
            label: "Submitted",
            color: "bg-blue-100 text-blue-900",
            isRejected: false,
            reason: null,
            role: null,
            at: null,
          })
          return
        }

        if (subStatus.includes("archived")) {
          setDecision({
            label: "Archived",
            color: "bg-purple-100 text-purple-900",
            isRejected: false,
            reason: null,
            role: null,
            at: null,
          })
          return
        }

        // generic fallback
        setDecision({
          label: submission.status || "Status",
          color: "bg-gray-100 text-gray-800",
          isRejected: subStatus.includes("rejected"),
          reason: null,
          role: null,
          at: null,
        })
      } catch (e) {
        console.error("Failed to fetch review decision:", e)
        // still show something
        const subStatus = String(submission?.status || "Status")
        setDecision({
          label: subStatus,
          color: "bg-gray-100 text-gray-800",
          isRejected: subStatus.toLowerCase().includes("rejected"),
          reason: null,
          role: null,
          at: null,
        })
      } finally {
        setDecisionLoading(false)
      }
    }

    fetchDecision()
  }, [submission?.id, submission?.status, supabase])

  // ✅ Only allow roles SubmissionDetail supports
  const reviewerRole: "pc" | "amo" | undefined =
    userRole === "pc" || userRole === "amo" ? userRole : undefined

  const isRecords = userRole === "records"

  const handleDownload = async () => {
    if (!isRecords) return

    if (!latestDoc?.file_path) {
      alert("No file attached to this submission yet.")
      return
    }

    try {
      setDownloading(true)

      const { data, error } = await supabase.storage
        .from("submissions")
        .download(latestDoc.file_path)

      if (error) throw error
      if (!data) throw new Error("No file data returned")

      const url = window.URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = latestDoc.file_name || "download"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Download failed:", err)
      alert("Download failed. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Submission not found</div>
        <Button asChild variant="outline" className="mt-4 bg-transparent">
          <Link href="/dashboard/submissions">Back to Submissions</Link>
        </Button>
      </div>
    )
  }

  const showRejectedBanner = !!decision?.isRejected

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <Button variant="outline" asChild className="text-slate-600 bg-transparent">
          <Link href="/dashboard/submissions">← Back to Submissions</Link>
        </Button>

        {/* ✅ Records-only download button */}
        {isRecords && (
          <div className="flex items-center gap-2">
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? "Preparing download..." : "Download File"}
            </Button>
          </div>
        )}
      </div>

      {/* ✅ Status pill ALWAYS shown on View page */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-slate-600">Status:</span>
        {decisionLoading ? (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Loading…
          </span>
        ) : decision ? (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${decision.color}`}>
            {decision.label}
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {String(submission.status || "Status")}
          </span>
        )}
      </div>

      {/* ✅ Rejection reason banner (shows PC/AMO + reason) */}
      {showRejectedBanner && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-semibold text-red-900">{decision?.label ?? "Rejected"}</div>

          {decision?.reason ? (
            <div className="mt-1 text-sm text-red-800">
              <span className="font-medium">Reason:</span> {decision.reason}
            </div>
          ) : (
            <div className="mt-1 text-sm text-red-800">
              <span className="font-medium">Reason:</span> No rejection reason provided.
            </div>
          )}

          {decision?.at ? (
            <div className="mt-1 text-xs text-red-700">{new Date(decision.at).toLocaleString()}</div>
          ) : null}
        </div>
      )}

      {/* Optional: show latest file info (records only) */}
      {isRecords && (
        <div className="mb-4 text-sm text-slate-600">
          {latestDoc ? (
            <>
              Latest file:{" "}
              <span className="font-medium text-slate-900">{latestDoc.file_name}</span> (v{latestDoc.version})
            </>
          ) : (
            "No document uploaded for this submission yet."
          )}
        </div>
      )}

      <SubmissionDetail submission={submission} onBack={() => router.back()} reviewerRole={reviewerRole} />
    </div>
  )
}
