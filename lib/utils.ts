import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// lib/email/sendReviewEmail.ts

type ReviewEmailParams = {
  to_email: string
  to_name: string
  submission_title: string
  action: "approved" | "rejected"
  reviewer_role: "PC" | "AMO"
  review_comment?: string
}

export async function sendReviewEmail({
  to_email,
  to_name,
  submission_title,
  action,
  reviewer_role,
  review_comment,
}: ReviewEmailParams) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email,
        to_name,
        submission_title,
        action,
        reviewer_role,
        review_comment: review_comment || "No comments provided.",
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`EmailJS failed: ${text}`)
  }
}
