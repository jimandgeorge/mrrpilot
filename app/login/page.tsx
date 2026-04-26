"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, ShieldAlert, Sparkles } from "lucide-react";

type Mode = "login" | "signup" | "reset" | "recovery";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirm, setNewConfirm] = useState("");
  const isRecoveryRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const desc = hash.get("error_description");
    if (desc) setError(desc.replace(/\+/g, " "));
    if (hash.get("type") === "signup") setConfirmed(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        isRecoveryRef.current = true;
        setMode("recovery");
      }
      if (event === "SIGNED_IN" && !isRecoveryRef.current) {
        // New users go to onboarding; returning users get passed through
        // Onboarding page will redirect to dashboard if Stripe is already connected
        supabase.from("stripe_connections").select("id").limit(1).then(({ data }) => {
          window.location.href = (data && data.length > 0) ? "/dashboard" : "/onboarding";
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  function clearMessages() { setError(""); setInfo(""); }

  async function handleLogin() {
    clearMessages();
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email before logging in.");
        setInfo("Didn't get the email? Check your spam folder.");
      } else {
        setError(error.message);
      }
    }
  }

  async function handleSignUp() {
    clearMessages();
    if (!email || !password) { setError("Enter your email and password."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setInfo("Account created — check your email to confirm, then log in.");
      setMode("login");
    }
  }

  async function handleReset() {
    clearMessages();
    if (!email) { setError("Enter your email address."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setInfo("Password reset email sent — check your inbox.");
    }
  }

  async function handleUpdatePassword() {
    clearMessages();
    if (!newPassword) { setError("Enter a new password."); return; }
    if (newPassword !== newConfirm) { setError("Passwords don't match."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setInfo("Password updated! Redirecting…");
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    }
  }

  const features = [
    { icon: ShieldAlert, text: "Failed payments caught the moment they happen" },
    { icon: Mail,        text: "Recovery email written for you in one click" },
    { icon: Sparkles,    text: "AI tells you exactly what to do next" },
  ];

  return (
    <main className="min-h-screen bg-white flex">

      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative">
          <p className="text-white font-bold text-xl tracking-tight">Revenue Intelligence</p>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Recover revenue<br />you&apos;re already losing.
          </h1>
          <p className="text-indigo-200 text-base mb-10 leading-relaxed">
            Connect Stripe, Paddle, or Revolut in 30 seconds. Every failed payment, at-risk customer, and recovery opportunity — instantly.
          </p>
          <ul className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-indigo-200" strokeWidth={1.8} />
                </div>
                <p className="text-indigo-100 text-sm">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-indigo-400 text-xs">© {new Date().getFullYear()} Revenue Intelligence</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50 lg:bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <p className="text-xl font-bold text-gray-900">Revenue Intelligence</p>
            <p className="text-sm text-gray-400 mt-1">Revenue Recovery</p>
          </div>

          {/* Email confirmed state */}
          {confirmed ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Email confirmed!</h2>
                <p className="text-sm text-gray-500 mt-1">Signing you in and taking you to setup…</p>
              </div>
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : mode === "recovery" ? (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Set a new password</h2>
              <p className="text-sm text-gray-400 mb-6">Choose something at least 8 characters long.</p>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 mb-4">{error}</p>}
              {info  && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5 mb-4">{info}</p>}

              <div className="space-y-4">
                <Field label="New password" type="password" placeholder="Min. 8 characters" value={newPassword} onChange={setNewPassword} onEnter={handleUpdatePassword} />
                <Field label="Confirm password" type="password" placeholder="••••••••" value={newConfirm} onChange={setNewConfirm} onEnter={handleUpdatePassword} />
                <SubmitButton loading={loading} onClick={handleUpdatePassword} label="Set new password" />
              </div>
            </div>
          ) : mode === "reset" ? (
            <div>
              <button onClick={() => { setMode("login"); clearMessages(); }} className="text-xs text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1 transition-colors">
                ← Back to login
              </button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h2>
              <p className="text-sm text-gray-400 mb-6">We'll send a reset link to your email.</p>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 mb-4">{error}</p>}
              {info  && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5 mb-4">{info}</p>}

              <div className="space-y-4">
                <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} onEnter={handleReset} />
                <SubmitButton loading={loading} onClick={handleReset} label="Send reset email" />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                {mode === "login" ? "Log in to your Revenue Intelligence account." : "Find lost revenue in 2 minutes — free."}
              </p>

              {/* Login / Signup toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                {(["login", "signup"] as const).map((m) => (
                  <button key={m} onClick={() => { setMode(m); clearMessages(); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                    {m === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 mb-4">{error}</p>}
              {info  && <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5 mb-4">{info}</p>}

              <div className="space-y-4">
                <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={setEmail}
                  onEnter={mode === "login" ? handleLogin : handleSignUp} />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-500">Password</label>
                    {mode === "login" && (
                      <button onClick={() => { setMode("reset"); clearMessages(); }}
                        className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignUp())}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  />
                </div>

                {mode === "signup" && (
                  <Field label="Confirm password" type="password" placeholder="••••••••" value={confirm} onChange={setConfirm} onEnter={handleSignUp} />
                )}

                <SubmitButton loading={loading}
                  onClick={mode === "login" ? handleLogin : handleSignUp}
                  label={mode === "login" ? "Log in" : "Create account"} />
              </div>
            </div>
          )}

        </div>
      </div>

    </main>
  );
}

function Field({ label, type, placeholder, value, onChange, onEnter }: {
  label: string; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; onEnter: () => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 block mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
      />
    </div>
  );
}

function SubmitButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1"
    >
      {loading ? "…" : label}
    </button>
  );
}
