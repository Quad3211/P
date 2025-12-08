"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import SubmissionDetail from "@/components/shared/submission-detail"
import { getSubmissions } from "@/lib/api"

export default function SubmissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const data = await getSubmissions()
        const found = data.find((s: any) => s.id === params.id)
        if (found) {
          setSubmission(found)
        }
      } catch (error) {
        console.error("Failed to fetch submission:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubmission()
  }, [params.id])

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

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" asChild className="mb-6 text-slate-600 bg-transparent">
        <Link href="/dashboard/submissions">← Back to Submissions</Link>
      </Button>
      <SubmissionDetail submission={submission} onBack={() => router.back()} />
    </div>
  )
}
