// Fixed API client with proper error handling
export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))
      console.error(`API Error [${endpoint}]:`, error)
      throw new Error(error.error || error.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Network Error [${endpoint}]:`, error)
    throw error
  }
}

export async function getSubmissions(status?: string, instructorId?: string) {
  try {
    const url = new URL("/api/submissions", window.location.origin)
    if (status) url.searchParams.append("status", status)
    if (instructorId) url.searchParams.append("instructor_id", instructorId)
    return await apiCall(url.toString())
  } catch (error) {
    console.error("getSubmissions failed:", error)
    return []
  }
}

export async function createSubmission(data: any) {
  try {
    return await apiCall("/api/submissions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error("createSubmission failed:", error)
    throw error
  }
}

export async function getSubmission(id: string) {
  try {
    return await apiCall(`/api/submissions/${id}`)
  } catch (error) {
    console.error("getSubmission failed:", error)
    throw error
  }
}

export async function getSubmissionDoc(id: string) {
  try {
    return await apiCall(`/api/submissions/${id}/documents`)
  } catch (error) {
    console.error("getSubmissionDoc failed:", error)
    return []
  }
}

export async function updateSubmission(id: string, data: any) {
  try {
    return await apiCall(`/api/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error("updateSubmission failed:", error)
    throw error
  }
}

export async function uploadDocument(submissionId: string, file: File) {
  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("submissionId", submissionId)

    const response = await fetch(`/api/submissions/${submissionId}/documents`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("Upload failed response:", text)
      throw new Error("Upload failed: " + text)
    }

    return response.json()
  } catch (error) {
    console.error("uploadDocument failed:", error)
    throw error
  }
}

export async function createReview(data: any) {
  try {
    return await apiCall("/api/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error("createReview failed:", error)
    throw error
  }
}

export async function getReviews(submissionId?: string) {
  try {
    const url = new URL("/api/reviews", window.location.origin)
    if (submissionId) url.searchParams.append("submission_id", submissionId)
    return await apiCall(url.toString())
  } catch (error) {
    console.error("getReviews failed:", error)
    return []
  }
}

export async function archiveSubmission(data: any) {
  try {
    return await apiCall("/api/archive", {
      method: "POST",
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error("archiveSubmission failed:", error)
    throw error
  }
}

export async function getNotifications() {
  try {
    return await apiCall("/api/notifications")
  } catch (error) {
    console.error("getNotifications failed:", error)
    return []
  }
}

export async function getAuditLogs(filters?: any) {
  try {
    const url = new URL("/api/audit-logs", window.location.origin)
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value as string)
    })
    return await apiCall(url.toString())
  } catch (error) {
    console.error("getAuditLogs failed:", error)
    return []
  }
}

export async function getUsers() {
  try {
    return await apiCall("/api/users")
  } catch (error) {
    console.error("getUsers failed:", error)
    return []
  }
}