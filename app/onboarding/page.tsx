"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, ArrowRight, Shield, ExternalLink, ChevronLeft } from "lucide-react";

type Step = "loading" | "pick" | "connect" | "done";
type ProviderId = "stripe" | "paddle" | "revolut";

const PROVIDERS = [
  {
    id: "stripe" as ProviderId,
    name: "Stripe",
    tagline: "Paste your Stripe secret key",
    placeholder: "sk_live_... or sk_test_...",
    hint: "Stripe → Developers → API keys",
    hintUrl: "https://dashboard.stripe.com/apikeys",
    bodyKey: "stripeKey",
    endpoint: "/api/stripe/connect",
  },
  {
    id: "paddle" as ProviderId,
    name: "Paddle",
    tagline: "Paste your Paddle API key",
    placeholder: "Your Paddle API key...",
    hint: "Paddle → Developer Tools → Authentication",
    hintUrl: "https://vendors.paddle.com/authentication",
    bodyKey: "paddleKey",
    endpoint: "/api/paddle/connect",
  },
  {
    id: "revolut" as ProviderId,
    name: "Revolut",
    tagline: "Paste your Revolut Merchant API key",
    placeholder: "Your Revolut API key...",
    hint: "Revolut Business → APIs → Merchant API",
    hintUrl: "https://business.revolut.com/merchant",
    bodyKey: "revolutKey",
    endpoint: "/api/revolut/connect",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("loading");
  const [providerId, setProviderId] = useState<ProviderId | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const token = session.access_token;

      const [stripe, paddle, revolut] = await Promise.all([
        fetch("/api/stripe/connect", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
        fetch("/api/paddle/connect", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
        fetch("/api/revolut/connect", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({})),
      ]);

      if (stripe.connected || paddle.connected || revolut.connected) {
        window.location.href = "/dashboard";
      } else {
        setStep("pick");
      }
    }
    check();
  }, []);

  const provider = PROVIDERS.find(p => p.id === providerId) ?? null;

  async function handleConnect() {
    if (!provider) return;
    setError("");
    const key = keyInput.trim();
    if (!key) { setError("Please enter your API key."); return; }
    if (provider.id === "stripe" && !key.startsWith("sk_")) {
      setError("Stripe key must start with sk_live_ or sk_test_");
      return;
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(provider.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ [provider.bodyKey]: key }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      setError(data.error);
    } else {
      setStep("done");
      setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
    }
  }

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 flex">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative">
          <p className="text-white font-bold text-xl tracking-tight">Revenue Intelligence</p>
        </div>
        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-3">
              You're one step<br />away from clarity.
            </h1>
            <p className="text-indigo-200 text-base leading-relaxed">
              Connect Stripe, Paddle, or Revolut and Revenue Intelligence will pull your MRR, flag at-risk customers, and brief you every morning.
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
        <p className="relative text-indigo-400 text-xs">© {new Date().getFullYear()} Revenue Intelligence</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          <div className="lg:hidden text-center mb-8">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">Revenue Intelligence</p>
          </div>

          {step === "done" ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-green-500 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{provider?.name} connected!</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Taking you to your dashboard…</p>
              </div>
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>

          ) : step === "pick" ? (
            <div>
              <div className="flex items-center gap-2 mb-8">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">2</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Choose your payment provider</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select the platform you use to collect subscription payments.</p>

              <div className="space-y-3">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setProviderId(p.id); setStep("connect"); setKeyInput(""); setError(""); }}
                    className="w-full flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors text-left group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.tagline}</p>
                    </div>
                    <ArrowRight size={15} className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

          ) : step === "connect" && provider ? (
            <div>
              <div className="flex items-center gap-2 mb-8">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div className="h-px flex-1 bg-indigo-300" />
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
              </div>

              <button
                onClick={() => { setStep("pick"); setKeyInput(""); setError(""); }}
                className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors mb-5"
              >
                <ChevronLeft size={13} /> Back
              </button>

              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Connect {provider.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Paste your {provider.name} API key below. We use read-only access to pull your revenue data.
              </p>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg px-4 py-2.5 mb-4">{error}</p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">{provider.name} API Key</label>
                  <input
                    type="password"
                    placeholder={provider.placeholder}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value.trim())}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    autoComplete="off"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 bg-white dark:bg-gray-800"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
                    Find it in {provider.hint}.{" "}
                    <a href={provider.hintUrl} target="_blank" rel="noopener noreferrer"
                      className="text-indigo-500 dark:text-indigo-400 inline-flex items-center gap-0.5">
                      Open <ExternalLink size={10} />
                    </a>
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={saving || !keyInput}
                  className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? "Validating…" : <>{`Connect ${provider.name}`} <ArrowRight size={15} /></>}
                </button>

                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                  You can add more providers later in{" "}
                  <a href="/settings" className="text-indigo-400 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-100">Settings</a>
                </p>
              </div>
            </div>
          ) : null}

        </div>
      </div>
    </main>
  );
}
