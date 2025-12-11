"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Mail, Chrome } from "lucide-react";

type UserRole = "instructor" | "pc" | "amo" | "im" | "registration" | "records";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: "instructor",
    label: "Instructor",
    description: "Submit and track documents",
  },
  {
    value: "pc",
    label: "PC Reviewer",
    description: "First-level review and approval",
  },
  {
    value: "amo",
    label: "AMO Reviewer",
    description: "Final review and approval",
  },
  { value: "im", label: "IM", description: "View submissions and status" },
  {
    value: "registration",
    label: "Registration",
    description: "View submissions and status",
  },
  {
    value: "records",
    label: "Records Manager",
    description: "Archive and download files",
  },
];

interface SignInPageProps {
  onSignIn: (name: string, role: UserRole) => void;
}

export default function SignInPage({ onSignIn }: SignInPageProps) {
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("instructor");
  const [step, setStep] = useState<"role" | "name">("role");
  const [error, setError] = useState("");

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep("name");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    onSignIn(name.trim(), selectedRole);
  };

  const constructedEmail = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .concat("@school.edu");

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Hero */}
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center flex-col justify-between p-12"
        style={{
          backgroundImage: "url('/modern-school-building-architecture.jpg')",
          backgroundColor: "#1e3a5f",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-400 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xl font-bold">
            Submission Portal
          </span>
        </div>

        <div className="text-white space-y-4">
          <h2 className="text-5xl font-bold leading-tight">
            Submission Portal
          </h2>
          <p className="text-lg text-blue-100">
            Streamlining test document submissions, reviews, and archiving for
            educational excellence.
          </p>
        </div>

        <div className="text-sm text-blue-200">
          © 2025 Your School District. All rights reserved.
        </div>
      </div>

      {/* Right side - Sign In */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-cyan-400 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Submission Portal</span>
            </div>
          </div>

          {step === "role" ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Sign in to your account
                </h1>
                <p className="text-slate-600">Select your role to continue</p>
              </div>

              <div className="space-y-3">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => handleRoleSelect(role.value)}
                    className="w-full p-4 text-left border-2 border-slate-200 rounded-lg hover:border-cyan-400 hover:bg-cyan-50 transition-all"
                  >
                    <div className="font-semibold text-slate-900">
                      {role.label}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {role.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  Sign in to your account
                </h1>
                <p className="text-slate-600">
                  Enter your email to receive a magic link to sign in.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="you@school.edu"
                    value={constructedEmail}
                    disabled
                    className="pl-10 bg-slate-50 border-slate-300"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Auto-generated from your name
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-semibold">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-slate-300 text-slate-900 placeholder:text-slate-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                type="submit"
                size="lg"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold h-11"
              >
                Continue with Email
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full text-slate-900 border-slate-300 hover:bg-slate-50 bg-transparent"
              >
                <Chrome className="w-5 h-5 mr-2" />
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full text-slate-900 border-slate-300 hover:bg-slate-50 bg-transparent"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.4 24c6.3 0 9.9-5.2 9.9-9.9 0-.2 0-.4-.1-.6 1.2-1 2.2-2.3 3-3.8-1.1.5-2.4.8-3.7.9 1.3-.8 2.3-2.1 2.8-3.7-1.2.7-2.6 1.2-4 1.5-1.2-1.2-2.9-2-4.8-2-3.6 0-6.5 2.9-6.5 6.5 0 .5.1 1 .2 1.5-5.4-.3-10.2-2.9-13.4-6.9-.6 1-.9 2.1-.9 3.3 0 2.3 1.2 4.3 2.9 5.5-1.1 0-2.2-.3-3.1-.8v.1c0 3.2 2.2 5.8 5.2 6.4-.6.1-1.2.2-1.8.2-.4 0-.9 0-1.3-.1.9 2.8 3.5 4.8 6.6 4.9-2.1 1.7-4.9 2.7-7.8 2.7-.5 0-1 0-1.5-.1 2.9 1.9 6.3 3 10.1 3" />
                </svg>
                Continue with Microsoft
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("role");
                  setName("");
                }}
                className="w-full text-center text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Change role
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
