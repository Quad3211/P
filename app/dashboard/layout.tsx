"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Navigation from "@/components/shared/navigation"
import Sidebar from "@/components/shared/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push("/auth/login")
  }, [router])

  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClient()
        
        if (!supabase) {
          console.error("Supabase client not available")
          router.push("/auth/login")
          return
        }

        const {
          data: { user: fetchedUser },
        } = await supabase.auth.getUser()

        if (!fetchedUser) {
          router.push("/auth/login")
          return
        }

        setUser(fetchedUser)

        const { data } = await supabase.from("profiles").select("*").eq("id", fetchedUser.id).single()

        if (data) {
          setProfile(data)
        }

        setLoading(false)
      } catch (error) {
        console.error("[v0] Error fetching profile:", error)
        setLoading(false)
        router.push("/auth/login")
      }
    }

    getUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userName={profile.full_name} userRole={profile.role} onSignOut={handleSignOut} />
      <Sidebar userRole={profile.role} />
      <main className="pl-64 pt-16">{children}</main>
    </div>
  )
}