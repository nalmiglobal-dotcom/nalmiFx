import Link from "next/link";

export default function RootPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-5xl font-bold text-white tracking-tight">
          Welcome to <span className="text-emerald-400">NalmiFX</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Your gateway to professional trading
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/login"
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg border border-slate-600 transition-colors duration-200"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
