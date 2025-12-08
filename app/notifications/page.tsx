"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Navigation from "@/components/shared/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (data) {
        setProfile(data)
      }

      // Fetch notifications
      try {
        const response = await fetch("/api/notifications")
        if (response.ok) {
          const data = await response.json()
          setNotifications(data)
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userName={profile.full_name} userRole={profile.role} onSignOut={handleSignOut} />
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          <div className="space-y-4">
            {notifications.length === 0 ? (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="py-12 text-center">
                  <p className="text-slate-600">No notifications</p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification, idx) => (
                <Card key={idx} className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
                  <CardContent className="py-6 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                      <p className="text-slate-600 text-sm mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-500 mt-2">{new Date(notification.timestamp).toLocaleString()}</p>
                    </div>
                    {notification.type === "submission" && (
                      <Link href="/dashboard">
                        <Button size="sm" className="ml-4">
                          View
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
