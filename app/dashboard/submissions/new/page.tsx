"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import SubmissionForm from "@/components/forms/submission-form"

export default function NewSubmissionPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="outline" asChild className="text-slate-600 bg-transparent">
          <Link href="/dashboard/submissions">← Back to Submissions</Link>
        </Button>
      </div>
      <SubmissionForm
        onSubmit={() => {
          router.push("/dashboard/submissions")
        }}
      />
    </div>
  )
}
