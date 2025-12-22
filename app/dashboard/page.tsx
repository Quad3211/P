"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// Import all dashboards
import InstructorDashboard from "@/components/dashboards/instructor-dashboard"
import PCDashboard from "@/components/dashboards/pc-dashboard"
import AMODashboard from "@/components/dashboards/amo-dashboard"
import InstitutionManagerDashboard from "@/components/dashboards/institution_manager-dashboard"
import RecordsDashboard from "@/components/dashboards/records-dashboard"
import RegistrationDashboard from "@/components/dashboards/registration-dashboard"
import AdministratorDashboard from "@/components/dashboards/administrator-dashboard" // ✅ NEW

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [userRole, setUserRole] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!supabase) {
        router.push("/auth/login")
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single()

        if (profile) {
          setUserRole(profile.role)
          setUserName(profile.full_name || user.email || "User")
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Route to appropriate dashboard based on role
  switch (userRole.toLowerCase()) {
    case "instructor":
    case "senior_instructor":
      return <InstructorDashboard userName={userName} />
    
    case "pc":
      return <PCDashboard userName={userName} />
    
    case "amo":
      return <AMODashboard userName={userName} />
    
    case "institution_manager":
      return <InstitutionManagerDashboard userName={userName} />
    
    case "administrator":
      return <AdministratorDashboard userName={userName} /> // ✅ NEW - Separate admin dashboard
    
    case "records":
      return <RecordsDashboard userName={userName} />
    
    case "registration":
      return <RegistrationDashboard />
    
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Unknown role: {userRole}</p>
            <button 
              onClick={() => router.push("/auth/login")}
              className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded"
            >
              Back to Login
            </button>
          </div>
        </div>
      )
  }
}