/** @format */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getSubmissions } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

/* ================= TYPES ================= */

interface Submission {
  id: string;
  submission_id: string;
  skill_area: string;
  cohort: string;
  test_date: string;
  status: string;
  updated_at: string;
  instructor_name: string;
  cluster: string;
}

type ReviewRow = {
  id: string;
  submission_id: string;
  reviewer_role: "pc" | "amo";
  status: "pending" | "approved" | "rejected" | "reassigned";
};

type ReviewMap = Record<
  string,
  {
    pc?: ReviewRow;
    amo?: ReviewRow;
  }
>;

/* ================= PAGE ================= */

export default function DashboardPage() {
  const supabase = createClient();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewsBySubmission, setReviewsBySubmission] = useState<ReviewMap>({});
  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState<string>("");
  const [roleLoading, setRoleLoading] = useState(true);

  if (!supabase) return null;

  /* ---------- Fetch role ---------- */
  useEffect(() => {
    const fetchRole = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      setUserRole((profile?.role || "").toLowerCase());
      setRoleLoading(false);
    };

    fetchRole();
  }, [supabase]);

  /* ---------- Fetch submissions ---------- */
  useEffect(() => {
    const fetchSubmissions = async () => {
      const data: any = await getSubmissions();
      setSubmissions(data || []);
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  /* ---------- Fetch reviews ---------- */
  useEffect(() => {
    if (!submissions.length) return;

    const fetchReviews = async () => {
      const ids = submissions.map((s) => s.id);

      const { data } = await supabase
        .from("reviews")
        .select("id, submission_id, reviewer_role, status")
        .in("submission_id", ids)
        .in("reviewer_role", ["pc", "amo"]);

      const map: ReviewMap = {};

      (data || []).forEach((r: any) => {
        const sid = String(r.submission_id);
        if (!map[sid]) map[sid] = {};
        if (r.reviewer_role === "pc") map[sid].pc = r;
        if (r.reviewer_role === "amo") map[sid].amo = r;
      });

      setReviewsBySubmission(map);
    };

    fetchReviews();
  }, [submissions, supabase]);

  const canCreateSubmission = userRole !== "records";

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Dashboard
            </h1>
            <p className="text-slate-600">Recent submissions overview</p>
          </div>

          {!roleLoading && canCreateSubmission && (
            <Button
              asChild
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Link href="/dashboard/submissions/new" className="gap-2">
                <Plus className="w-4 h-4" />
                Start New Submission
              </Link>
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">
              Recent Submissions
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-600">
                Loading...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="px-6 py-4 text-left">ID</th>
                      <th className="px-6 py-4 text-left">INSTRUCTOR</th>
                      <th className="px-6 py-4 text-left">PROGRAMME</th>
                      <th className="px-6 py-4 text-left">CLUSTER</th>
                      <th className="px-6 py-4 text-left">STATUS</th>
                      <th className="px-6 py-4 text-left">ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {submissions.slice(0, 5).map((submission) => (
                      <tr key={submission.id} className="border-b hover:bg-slate-50">
                        <td className="px-6 py-4 text-cyan-600 font-medium">
                          {submission.submission_id}
                        </td>

                        <td className="px-6 py-4">
                          {submission.instructor_name || "—"}
                        </td>

                        <td className="px-6 py-4">
                          {submission.skill_area} - {submission.cohort}
                        </td>

                        <td className="px-6 py-4">
                          {submission.cluster}
                        </td>

                        <td className="px-6 py-4">
                          {(() => {
                            const review = reviewsBySubmission[submission.id];
                            let label = submission.status;
                            let color = "bg-gray-100 text-gray-800";

                            if (review?.amo) {
                              if (review.amo.status === "approved") {
                                label = "AMO Approved";
                                color = "bg-green-100 text-green-900";
                              } else if (review.amo.status === "rejected") {
                                label = "Rejected by AMO";
                                color = "bg-red-100 text-red-900";
                              } else {
                                label = "AMO Pending";
                                color = "bg-yellow-100 text-yellow-800";
                              }
                            } else if (review?.pc) {
                              if (review.pc.status === "approved") {
                                label = "PC Approved";
                                color = "bg-amber-100 text-amber-900";
                              } else if (review.pc.status === "rejected") {
                                label = "Rejected by PC";
                                color = "bg-red-100 text-red-900";
                              } else {
                                label = "PC Pending";
                                color = "bg-yellow-100 text-yellow-800";
                              }
                            }

                            return (
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}
                              >
                                {label}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/submissions/${submission.id}`}
                            className="text-cyan-600 font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
