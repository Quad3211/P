  // API client utilities
  export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `API error: ${response.status}`)
    }

    return response.json()
  }

export async function getSubmissions(
  status?: string,
  instructorId?: string
) {
  const url = new URL("/api/submissions", window.location.origin)

  if (status) url.searchParams.append("status", status)
  if (instructorId) url.searchParams.append("instructor_id", instructorId)

  return apiCall(url.toString())
}


export async function createSubmission(data: any) {
  return apiCall("/api/submissions", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

  export async function getSubmission(id: string) {
    return apiCall(`/api/submissions/${id}`)
}
  
  export async function getSubmissionDoc(id: string) {
    return apiCall(`/api/submissions/${id}/documents`)
  }

  export async function updateSubmission(id: string, data: any) {
    return apiCall(`/api/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

export async function uploadDocument(submissionId: string, file: File) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("submissionId", submissionId)

  const response = await fetch(`/api/submissions/${submissionId}/documents?submissionId=${submissionId}`
, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    console.error("Upload failed response:", text)
    throw new Error("Upload failed: " + text)
  }

  return response.json()
}


export async function createReview(data: any) {
  return apiCall("/api/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

  export async function getReviews(submissionId?: string) {
    const url = new URL("/api/reviews", window.location.origin)
    if (submissionId) url.searchParams.append("submission_id", submissionId)
    return apiCall(url.toString())
  }

  export async function archiveSubmission(data: any) {
    return apiCall("/api/archive", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  export async function getNotifications() {
    return apiCall("/api/notifications")
  }

  export async function getAuditLogs(filters?: any) {
    const url = new URL("/api/audit-logs", window.location.origin)
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value as string)
    })
    return apiCall(url.toString())
  }

  export async function getUsers() {
    return apiCall("/api/users")
  }
