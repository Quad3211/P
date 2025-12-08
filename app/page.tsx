"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function Home() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()

        if (!supabase) {
          setError("Supabase is not configured. Please check your environment variables.")
          router.push("/setup")
          return
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          router.push("/dashboard")
        } else {
          router.push("/auth/login")
        }
      } catch (err) {
        console.error("[v0] Auth check error:", err)
        setError("Authentication service unavailable")
        router.push("/setup")
      }
    }

    checkAuth()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Required</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/setup" className="text-cyan-600 hover:text-cyan-700 font-medium">
            Go to Setup
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
