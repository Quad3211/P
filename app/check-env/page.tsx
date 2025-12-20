// Create this file as: app/check-env/page.tsx
// Access it at: http://localhost:3000/check-env

"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function EnvCheckPage() {
  const [envCheck, setEnvCheck] = useState({
    hasUrl: false,
    hasKey: false,
    urlPreview: "",
    canCreateClient: false,
    clientError: "",
    authCheck: "",
  })

  useEffect(() => {
    const checkEnv = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      let canCreate = false
      let clientError = ""
      let authCheck = ""

      try {
        const supabase = createClient()
        if (supabase) {
          canCreate = true
          
          // Try to check auth
          try {
            const { data, error } = await supabase.auth.getUser()
            if (error) {
              authCheck = `Auth error: ${error.message}`
            } else {
              authCheck = data.user ? `Authenticated as: ${data.user.email}` : "Not authenticated (this is OK)"
            }
          } catch (authError: any) {
            authCheck = `Auth check failed: ${authError.message}`
          }
        } else {
          clientError = "createClient() returned null"
        }
      } catch (error: any) {
        clientError = error.message || "Unknown error"
      }

      setEnvCheck({
        hasUrl: !!url,
        hasKey: !!key,
        urlPreview: url ? `${url.substring(0, 30)}...` : "undefined",
        canCreateClient: canCreate,
        clientError,
        authCheck,
      })
    }

    checkEnv()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Environment Variables Check</h1>
        
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Supabase Configuration</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${envCheck.hasUrl ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL:</span>
                <span className="text-gray-600">{envCheck.hasUrl ? "✓ Set" : "✗ Missing"}</span>
              </div>
              
              {envCheck.hasUrl && (
                <div className="ml-6 text-sm text-gray-600">
                  Preview: {envCheck.urlPreview}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${envCheck.hasKey ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                <span className="text-gray-600">{envCheck.hasKey ? "✓ Set" : "✗ Missing"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Client Status</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${envCheck.canCreateClient ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-medium">Can Create Client:</span>
                <span className="text-gray-600">{envCheck.canCreateClient ? "✓ Yes" : "✗ No"}</span>
              </div>
              
              {envCheck.clientError && (
                <div className="ml-6 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800 font-medium">Error:</p>
                  <p className="text-sm text-red-700">{envCheck.clientError}</p>
                </div>
              )}
              
              {envCheck.authCheck && (
                <div className="ml-6 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800 font-medium">Auth Check:</p>
                  <p className="text-sm text-blue-700">{envCheck.authCheck}</p>
                </div>
              )}
            </div>
          </div>

          {(!envCheck.hasUrl || !envCheck.hasKey) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-bold text-yellow-900 mb-2">Action Required</h3>
              <p className="text-sm text-yellow-800 mb-4">
                Your Supabase environment variables are not configured. Please add them to your environment:
              </p>
              
              <div className="bg-white p-4 rounded border border-yellow-300 font-mono text-sm space-y-2">
                <div>NEXT_PUBLIC_SUPABASE_URL=your_supabase_url</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key</div>
              </div>
              
              <p className="text-sm text-yellow-800 mt-4">
                For local development, add these to <code className="bg-yellow-100 px-2 py-1 rounded">.env.local</code>
              </p>
              <p className="text-sm text-yellow-800 mt-2">
                For production, add them to your hosting platform's environment variables (e.g., Vercel)
              </p>
            </div>
          )}

          {envCheck.hasUrl && envCheck.hasKey && envCheck.canCreateClient && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-bold text-green-900 mb-2">✓ Configuration Looks Good!</h3>
              <p className="text-sm text-green-800">
                Your Supabase environment variables are properly configured. You can now use the application.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}