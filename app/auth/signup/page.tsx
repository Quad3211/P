"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

type Institution = "Boys Town" | "Stony Hill" | "Leap"

export default function SignupPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [institution, setInstitution] = useState<Institution>("Boys Town")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const generateEmail = (user: string) => {
    return `${user.trim().toLowerCase()}@heart-nsta.org`
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const email = generateEmail(username)

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            institution: institution,
            role: 'instructor',
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Account Created!</h2>
          <div className="space-y-4 text-left mb-6">
            <p className="text-gray-600">
              Your account has been successfully created. You can now sign in and start using the submission portal.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                <strong>What's next?</strong>
              </p>
              <ul className="text-sm text-green-800 mt-2 space-y-1 list-disc list-inside">
                <li>Sign in with your credentials</li>
                <li>Complete your profile if needed</li>
                <li>Start creating submissions</li>
              </ul>
            </div>
          </div>
          <Link
            href="/auth/login"
            className="inline-block px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium"
          >
            Sign In Now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Submission</h2>
        </div>

        <h3 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h3>
        <p className="text-gray-600 mb-6">
          Sign up as an instructor to start submitting documents.
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Full Name</Label>
            <Input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Institution <span className="text-red-500">*</span>
            </Label>
            <select
              value={institution}
              onChange={(e) => setInstitution(e.target.value as Institution)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            >
              <option value="Boys Town">Boys Town</option>
              <option value="Stony Hill">Stony Hill</option>
              <option value="Leap">Leap</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              You will only be able to access data from your selected institution
            </p>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Username</Label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <Input
                type="text"
                placeholder="john.doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-none focus:ring-0 flex-1"
              />
              <span className="px-3 text-gray-500 font-medium bg-gray-50">@heart-nsta.org</span>
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg font-medium"
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-cyan-600 font-medium hover:text-cyan-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}