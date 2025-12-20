"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const generateEmail = (user: string) => {
    return `${user.trim().toLowerCase()}@heart-nsta.org`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      if (!supabase) {
        setError(
          "Authentication service is not configured. Please contact administrator."
        );
        setLoading(false);
        return;
      }

      const email = generateEmail(username);

      // Attempt to sign in
      const { error: signInError, data } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        // Handle authentication errors
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Invalid username or password. Please try again.");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Please verify your email address before signing in.");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      // User authenticated successfully - redirect directly to dashboard
      if (data.user) {
        router.push("/dashboard");
      } else {
        setError("Authentication failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* Left side branding */}
        <div className="hidden md:flex flex-col justify-center text-white space-y-4">
          <h1 className="text-5xl font-bold leading-tight">
            Submission Portal
          </h1>
          <p className="text-xl text-slate-300">
            Streamlining test document submissions, reviews, and archiving for
            educational excellence.
          </p>
        </div>

        {/* Right side form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Submission</h2>
          </div>

          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            Sign in to your account
          </h3>
          <p className="text-gray-600 mb-8">
            Enter your username to access the portal.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <Input
                  type="text"
                  placeholder="john.doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="border-none focus:ring-0 flex-1"
                />
                <span className="px-3 text-gray-500 font-medium bg-gray-50">
                  @heart-nsta.org
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <Alert className="bg-red-50 border-red-200 text-red-900">
                <div className="flex items-start gap-2">
                  <span className="text-xl">❌</span>
                  <p>{error}</p>
                </div>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg font-medium h-11"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-cyan-600 font-medium hover:text-cyan-700"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}