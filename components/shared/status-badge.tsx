"use client";

import { Badge } from "@/components/ui/badge";

type SubmissionStatus =
  | "submitted"
  | "pc_approved"
  | "pc_rejected"
  | "amo_approved"
  | "amo_rejected"
  | "final_archived"
  | "draft"
  | "archived"
  | "pc_review"
  | "approved"
  | "rejected"
  | "amo_review";

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; color: string }
> = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-900" },
  pc_approved: { label: "PC Approved", color: "bg-amber-100 text-amber-900" },
  pc_rejected: { label: "PC Rejected", color: "bg-red-100 text-red-900" },
  amo_approved: { label: "AMO Approved", color: "bg-green-100 text-green-900" },
  amo_rejected: { label: "Rejected", color: "bg-red-100 text-red-900" },
  final_archived: { label: "Archived", color: "bg-purple-100 text-purple-900" },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-900" },
  archived: { label: "Archived", color: "bg-purple-100 text-purple-900" },
  pc_review: { label: "PC Review", color: "bg-yellow-100 text-yellow-900" },
  approved: { label: "Approved", color: "bg-green-100 text-green-900" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-900" },
  amo_review: { label: "AMO Review", color: "bg-yellow-100 text-yellow-900" },
};

interface StatusBadgeProps {
  status: SubmissionStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={config.color}>
      {config.label}
    </Badge>
  );
}
