import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Setup Required</h1>
            <p className="text-gray-600">Complete the following steps to configure the RFA Submission Portal.</p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="border-l-4 border-cyan-500 pl-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 1: Add Supabase Environment Variables</h2>
              <p className="text-gray-600 mb-4">You need to add two environment variables to your Vercel project:</p>
              <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-2 mb-4">
                <div className="text-gray-800">NEXT_PUBLIC_SUPABASE_URL=your_supabase_url</div>
                <div className="text-gray-800">NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key</div>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Find these values in your Supabase project settings at:{" "}
                <a
                  href="https://supabase.com/dashboard/project/_/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 font-medium break-all"
                >
                  supabase.com/dashboard/project/_/settings/api
                </a>
              </p>
            </div>

            {/* Step 2 */}
            <div className="border-l-4 border-cyan-500 pl-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 2: Set Environment Variables in Vercel</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-4">
                <li>Go to your Vercel project dashboard</li>
                <li>Navigate to Settings → Environment Variables</li>
                <li>Add the two Supabase variables above</li>
                <li>Redeploy your project</li>
              </ol>
              <p className="text-gray-600 text-sm">
                Alternatively, if developing locally, add these to your{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file.
              </p>
            </div>

            {/* Step 3 */}
            <div className="border-l-4 border-cyan-500 pl-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 3: Verify Database Tables</h2>
              <p className="text-gray-600 mb-4">The following database tables should exist in your Supabase project:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm ml-2">
                <li>profiles (user accounts and roles)</li>
                <li>submissions (RFA submissions)</li>
                <li>submission_documents (versioned documents)</li>
                <li>reviews (PC and AMO reviews)</li>
                <li>archived_submissions (long-term storage)</li>
                <li>audit_logs (activity tracking)</li>
              </ul>
            </div>

            {/* Next Steps */}
            <div className="border-l-4 border-green-500 pl-6 bg-green-50 rounded-r-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">After Configuration</h2>
              <p className="text-gray-600 mb-4">
                Once you've added the environment variables and redeployed your project, you can access the application:
              </p>
              <Link href="/auth/login">
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">Go to Login</Button>
              </Link>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-600 text-sm">
              Check the{" "}
              <a
                href="https://supabase.com/docs/guides/getting-started"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Supabase documentation
              </a>{" "}
              or contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
