"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Tab = "login" | "signup" | "reset";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newConfirm, setNewConfirm] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const isRecoveryRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const desc = hash.get("error_description");
    if (desc) setError(desc.replace(/\+/g, " "));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        isRecoveryRef.current = true;
        setIsRecovery(true);
      }
      if (event === "SIGNED_IN" && !isRecoveryRef.current) {
        window.location.href = "/";
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  function reset() {
    setError("");
    setInfo("");
  }

  async function handleLogin() {
    reset();
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email before logging in.");
        setInfo("Didn't get the email? Check your spam or use the Reset password tab to resend.");
      } else {
        setError(error.message);
      }
    }
  }

  async function handleReset() {
    reset();
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

  async function handleSignUp() {
    reset();
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
      setTab("login");
    }
  }

  async function handleUpdatePassword() {
    reset();
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
      setTimeout(() => { window.location.href = "/"; }, 1500);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "login",  label: "Log in"         },
    { key: "signup", label: "Sign up"        },
    { key: "reset",  label: "Reset password" },
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <p className="text-xl font-bold text-gray-900">RevInt</p>
          <p className="text-sm text-gray-500 mt-1">Revenue Intelligence</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {isRecovery ? (
            <>
              {/* Recovery header */}
              <div className="px-6 pt-6 pb-2">
                <p className="text-sm font-semibold text-gray-900">Set a new password</p>
                <p className="text-xs text-gray-400 mt-0.5">Choose a password at least 8 characters long.</p>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                    {error}
                  </p>
                )}
                {info && (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                    {info}
                  </p>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">New password</label>
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdatePassword()}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newConfirm}
                    onChange={(e) => setNewConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdatePassword()}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <button
                  onClick={handleUpdatePassword}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "…" : "Set new password"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setTab(t.key); reset(); }}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      tab === t.key
                        ? "text-gray-900 border-b-2 border-indigo-500"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                    {error}
                  </p>
                )}
                {info && (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5">
                    {info}
                  </p>
                )}

                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? handleLogin() : tab === "signup" ? handleSignUp() : handleReset())}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/* Password fields (login + signup only) */}
                {tab !== "reset" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">Password</label>
                    <input
                      type="password"
                      placeholder={tab === "signup" ? "Min. 8 characters" : "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? handleLogin() : handleSignUp())}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                )}

                {/* Confirm password (signup only) */}
                {tab === "signup" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1.5">Confirm password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={tab === "login" ? handleLogin : tab === "signup" ? handleSignUp : handleReset}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "…"
                    : tab === "login"  ? "Log in"
                    : tab === "signup" ? "Create account"
                    : "Send reset email"}
                </button>

              </div>
            </>
          )}

        </div>

      </div>
    </main>
  );
}
