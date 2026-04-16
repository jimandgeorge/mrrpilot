"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, ArrowRight, Shield, ExternalLink } from "lucide-react";

type Step = "loading" | "connect" | "done";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("loading");
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      const { data } = await supabase
        .from("stripe_connections")
        .select("id")
        .limit(1);
      if (data && data.length > 0) {
        window.location.href = "/dashboard";
      } else {
        setStep("connect");
      }
    }
    check();
  }, []);

  async function handleConnect() {
    setError("");
    const trimmedKey = keyInput.trim();
    if (!trimmedKey.startsWith("sk_")) {
      setError("Key must start with sk_live_ or sk_test_");
      return;
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ stripeKey: trimmedKey }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      setError(data.error);
    } else {
      setStep("done");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    }
  }

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative">
          <p className="text-white font-bold text-xl tracking-tight">RevInt</p>
        </div>
        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-3">
              You're one step<br />away from clarity.
            </h1>
            <p className="text-indigo-200 text-base leading-relaxed">
              Connect your Stripe account and RevInt will pull your MRR, flag at-risk customers, and brief you every morning.
            </p>
          </div>
          <div className="space-y-4">
            {[
              "Read-only access — we never move money",
              "Your key is encrypted at rest",
              "Works with live and test mode keys",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <Shield size={15} className="text-indigo-300 shrink-0" />
                <p className="text-indigo-100 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-indigo-400 text-xs">© {new Date().getFullYear()} RevInt</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <p className="text-xl font-bold text-gray-900">RevInt</p>
          </div>

          {step === "done" ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Stripe connected!</h2>
                <p className="text-sm text-gray-500 mt-1">Taking you to your dashboard…</p>
              </div>
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div>
              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div className="h-px flex-1 bg-gray-200" />
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-xs font-bold">2</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-1">Connect your Stripe account</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Paste your Stripe secret key below. We use read-only access to pull your revenue data.
              </p>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 mb-4">{error}</p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Stripe Secret Key</label>
                  <input
                    type="password"
                    placeholder="sk_live_... or sk_test_..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value.trim())}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    autoComplete="off"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Find it in{" "}
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-500 inline-flex items-center gap-0.5"
                    >
                      Stripe → Developers → API keys <ExternalLink size={10} />
                    </a>
                    . A restricted key with read-only access is ideal.
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={saving || !keyInput}
                  className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    "Validating…"
                  ) : (
                    <>Connect Stripe <ArrowRight size={15} /></>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400">
                  You can change this later in{" "}
                  <a href="/settings" className="text-indigo-400 hover:text-indigo-600">Settings</a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
