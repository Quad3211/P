import Link from "next/link"

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl text-green-600">✓</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Account Created</h2>
        <p className="text-gray-600 mb-6">
          A confirmation email has been sent to your inbox. Please verify your email to activate your account.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
