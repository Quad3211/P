"use client"

import { Button } from "@/components/ui/button"
import { LogOut, Menu, Bell } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type UserRole = "instructor" | "pc" | "amo" | "im" | "registration" | "records" | "admin"

const ROLE_LABELS: Record<UserRole, string> = {
  instructor: "Instructor",
  pc: "PC - Programme Coordinator",
  amo: "AMO - Academic Management",
  im: "IM - Information Management",
  registration: "Registration",
  records: "Records Manager",
  admin: "Administrator",
}

interface NavigationProps {
  userName: string
  userRole: UserRole
  onSignOut: () => void
}

export default function Navigation({ userName, userRole, onSignOut }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications")
        if (response.ok) {
          const notifications = await response.json()
          setNotificationCount(notifications.length)
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
    }

    fetchNotifications()
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">✓</span>
            </div>
            <h1 className="font-semibold text-foreground hidden md:block">SchoolFlow</h1>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[userRole]}</p>
          </div>

          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/notifications">
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={onSignOut} className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
