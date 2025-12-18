"use client"

import emailjs from "@emailjs/browser"

emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!)

interface ReviewEmailPayload {
  to_email: string
  to_name: string
  submission_title: string
  action: "approved" | "rejected"
  reviewer_role: string
  review_comment?: string
}

export async function sendReviewEmail(payload: ReviewEmailPayload) {
  return emailjs.send(
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
    process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
    {
      to_email: payload.to_email,
      to_name: payload.to_name,
      submission_title: payload.submission_title,
      action: payload.action,
      reviewer_role: payload.reviewer_role,
      review_comment: payload.review_comment || "No comments provided",
    }
  )
}
