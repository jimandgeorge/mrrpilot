import Link from "next/link";
import { Check } from "lucide-react";

export default function UpgradeSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Check size={24} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set</h1>
        <p className="text-gray-500 text-sm mb-8">Welcome to RevInt. Go catch some churn.</p>
        <Link
          href="/dashboard"
          className="inline-block bg-indigo-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
