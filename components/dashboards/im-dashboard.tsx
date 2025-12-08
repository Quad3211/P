"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import SubmissionList from "@/components/shared/submission-list"
import SubmissionDetail from "@/components/shared/submission-detail"

interface Submission {
  id: string
  skill_group: string
  cluster: string
  reference_code: string
  comments?: string
  file_name: string
  instructor_name: string
  status: "submitted" | "pc_approved" | "pc_rejected" | "amo_approved" | "amo_rejected" | "final_archived"
  created_at: string
  updated_at: string
  timeline: any[]
}

interface IMDashboardProps {
  userName: string
  readOnly?: boolean
}

export default function IMDashboard({ userName, readOnly }: IMDashboardProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [activeStatus, setActiveStatus] = useState<string>("all")
  const [submissions] = useState<Submission[]>([
    {
      id: "1",
      skill_group: "Advanced Programming",
      cluster: "Computer Science",
      reference_code: "ADV-CS-001",
      comments: "Python course materials",
      file_name: "python_course.pdf",
      instructor_name: "John Doe",
      status: "final_archived",
      created_at: "2025-01-15T10:00:00Z",
      updated_at: "2025-01-18T09:00:00Z",
      timeline: [],
    },
    {
      id: "2",
      skill_group: "Data Science",
      cluster: "Computer Science",
      reference_code: "DS-CS-001",
      comments: "Introductory materials",
      file_name: "ds_intro.pdf",
      instructor_name: "Jane Smith",
      status: "pc_rejected",
      created_at: "2025-01-14T15:30:00Z",
      updated_at: "2025-01-16T11:00:00Z",
      timeline: [],
    },
  ])

  const filteredSubmissions =
    activeStatus === "all" ? submissions : submissions.filter((s) => s.status === activeStatus)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Submissions Overview</h1>
        <p className="text-muted-foreground">View all submissions and their statuses</p>
      </div>

      {selectedSubmission ? (
        <SubmissionDetail submission={selectedSubmission} onBack={() => setSelectedSubmission(null)} viewOnly />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveStatus("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStatus === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All
            </button>
            {["submitted", "pc_approved", "pc_rejected", "amo_approved", "amo_rejected", "final_archived"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeStatus === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {status.replace(/_/g, " ").toUpperCase()}
                </button>
              ),
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Submission List</CardTitle>
              <CardDescription>{filteredSubmissions.length} submission(s) matching filters</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSubmissions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No submissions found</p>
              ) : (
                <SubmissionList
                  submissions={filteredSubmissions}
                  onSelectSubmission={setSelectedSubmission}
                  showInstructor
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
