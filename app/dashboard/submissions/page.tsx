"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getSubmissions } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

/* ================= TYPES ================= */

interface Submission {
  id: string;
  submission_id: string;
  instructor_name?: string;
  course?: string;
  skill_area: string;
  cohort: string;
  status: string;
  updated_at: string;
}

type ReviewRow = {
  id: string;
  submission_id: string;
  reviewer_role: "pc" | "amo";
  status: "pending" | "approved" | "rejected" | "reassigned";
  comments: string | null;
  reviewed_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type ReviewMap = Record<
  string,
  {
    pc?: ReviewRow;
    amo?: ReviewRow;
  }
>;

/* ================= PAGE ================= */

export default function SubmissionsPage() {
  const supabase = createClient();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  const [reviewsBySubmission, setReviewsBySubmission] = useState<ReviewMap>({});
  const [reviewsLoading, setReviewsLoading] = useState(false);

  if (!supabase) return null;

  /* ---------- Fetch user role ---------- */
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };

    fetchUserRole();
  }, [supabase]);

  /* ---------- Fetch submissions ---------- */
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data: any = await getSubmissions();
        setSubmissions(data || []);
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  /* ---------- Fetch reviews ---------- */
  useEffect(() => {
    const run = async () => {
      if (!submissions.length) return;

      try {
        setReviewsLoading(true);

        const ids = submissions.map((s) => s.id);

        const { data, error } = await supabase
          .from("reviews")
          .select(
            "id, submission_id, reviewer_role, status, comments, reviewed_at, updated_at, created_at"
          )
          .in("submission_id", ids)
          .in("reviewer_role", ["pc", "amo"]);

        if (error) throw error;

        const map: ReviewMap = {};
        (data || []).forEach((r: any) => {
          const sid = String(r.submission_id);
          if (!map[sid]) map[sid] = {};
          if (r.reviewer_role === "pc") map[sid].pc = r;
          if (r.reviewer_role === "amo") map[sid].amo = r;
        });

        setReviewsBySubmission(map);
      } catch (e) {
        console.error("Failed to fetch reviews:", e);
      } finally {
        setReviewsLoading(false);
      }
    };

    run();
  }, [submissions, supabase]);

  /* ---------- Search ---------- */
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(
      (sub) =>
        sub.submission_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.instructor_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (sub.course || sub.skill_area)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [submissions, searchQuery]);

  // Check if user can create new submissions (only instructors and PC)
  const canCreateSubmission = userRole === "instructor" || userRole === "senior_instructor" || userRole === "pc";

  /* ================= RENDER ================= */

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            My Submissions
          </h1>
          <p className="text-slate-600">
            Manage all your test submissions
          </p>
        </div>

        {/* Only show New Submission button for instructors and PC */}
        {canCreateSubmission && (
          <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white">
            <Link href="/dashboard/submissions/new" className="gap-2">
              <Plus className="w-4 h-4" />
              New Submission
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <Input
            placeholder="Search by ID, instructor, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              No submissions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left font-semibold">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">
                      INSTRUCTOR
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">
                      PROGRAMME
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">
                      STATUS
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">
                      ACTION
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSubmissions.map((submission) => {
                    const review = reviewsBySubmission[submission.id];

                    let label = "Submitted";
                    let color = "bg-blue-100 text-blue-900";

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
                      <tr
                        key={submission.id}
                        className="border-b border-slate-200 hover:bg-slate-50"
                      >
                        <td className="px-6 py-4 font-medium text-cyan-600">
                          {submission.submission_id}
                        </td>

                        <td className="px-6 py-4">
                          {submission.instructor_name || "—"}
                        </td>

                        <td className="px-6 py-4 text-slate-700">
                          {submission.course || submission.skill_area} - {submission.cohort}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}
                          >
                            {label}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/submissions/${submission.id}`}
                            className="text-cyan-600 hover:text-cyan-700 font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}