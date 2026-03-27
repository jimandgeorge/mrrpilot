"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const desc = hash.get("error_description");
    if (desc) setError(desc.replace(/\+/g, " "));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        window.location.href = "/";
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <main className="flex items-center justify-center mt-20">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-center">
          Login to MRRPilot
        </h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </p>
        )}

        {sent ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3 text-center">
            Check your email for a magic link.
          </p>
        ) : (
          <>
            <input
              type="email"
              placeholder="you@example.com"
              className="border p-3 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={handleLogin}
              className="bg-black text-white p-3 rounded hover:opacity-90"
            >
              Send Magic Link
            </button>
          </>
        )}
      </div>
    </main>
  );
}