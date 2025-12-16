"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, Archive, Settings, LogOut, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  userRole: string
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["all"] },
    { href: "/dashboard/submissions", label: "Submissions", icon: FileText, roles: ["all"] },
    { href: "/dashboard/archive", label: "Archive", icon: Archive, roles: ["records", "admin"] },
    { href: "/dashboard/users", label: "User Management", icon: Users, roles: ["im", "admin"] },
    { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["admin", "records", "im"] },
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

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 border-r border-border bg-card overflow-y-auto">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          if (!canAccess(item.roles)) return null
          
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href) ? "bg-cyan-500 text-white" : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Button onClick={handleLogout} variant="outline" className="w-full gap-2 bg-transparent">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}