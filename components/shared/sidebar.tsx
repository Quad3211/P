// components/shared/sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, Archive, Settings, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface SidebarProps {
  userRole: string
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      if (supabase) {
        await supabase.auth.signOut()
      }
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/auth/login")
    }
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["all"] },
    { href: "/dashboard/submissions", label: "Submissions", icon: FileText, roles: ["all"] },
    { href: "/dashboard/archive", label: "Archive", icon: Archive, roles: ["records", "head_of_programs"] },
    { 
      href: "/dashboard/users", 
      label: "User Management", 
      icon: Users, 
      roles: ["institution_manager", "head_of_programs"] // ✅ Both can access
    },
    { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["head_of_programs", "records", "institution_manager"] },
  ]

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const canAccess = (roles: string[]) => {
    if (roles.includes("all")) return true
    return roles.includes(userRole)
  }

  if (!isClient) {
    return null
  }

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 border-r border-border bg-card overflow-y-auto z-40">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          if (!canAccess(item.roles)) return null
          
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href) 
                  ? "bg-cyan-500 text-white" 
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}