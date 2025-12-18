"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Navigation from "@/components/shared/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  if(!supabase) return

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

        // Only admins and records managers can access settings
        if (!["admin", "records"].includes(data.role)) {
          router.push("/dashboard")
          return
        }
      }

      // Fetch audit logs
      try {
        const logsResponse = await fetch("/api/audit-logs")
        if (logsResponse.ok) {
          const logs = await logsResponse.json()
          setAuditLogs(logs.slice(0, 50))
        }
      } catch (error) {
        console.error("Failed to fetch audit logs:", error)
      }

      // Fetch workflow settings
      try {
        const settingsResponse = await fetch("/api/settings/workflow")
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          setSettings(settingsData)
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      }

      setLoading(false)
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
            <h1 className="text-3xl font-bold text-slate-900">Settings & Audit Logs</h1>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Workflow Settings */}
            <Card className="border-0 shadow-sm bg-white lg:col-span-1">
              <CardHeader>
                <CardTitle>Workflow Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Review Timeouts (days)</Label>
                  <Input
                    type="number"
                    defaultValue={settings?.review_timeouts_days || 14}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Escalation Email</Label>
                  <Input
                    type="email"
                    defaultValue={settings?.escalation_email || ""}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">File Retention (years)</Label>
                  <Input
                    type="number"
                    defaultValue={settings?.file_retention_years || 5}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Audit Logs */}
            <Card className="border-0 shadow-sm bg-white lg:col-span-2">
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Date & Time</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-600">
                            No activity logged yet
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log, idx) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                {log.action_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs">{log.action}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
