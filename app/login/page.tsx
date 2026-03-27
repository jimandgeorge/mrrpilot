"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Check your email!");
    }
  };

  return (
    <main className="flex items-center justify-center mt-20">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-md flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-center">
          Login to MRRPilot
        </h1>

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
      </div>
    </main>
  );
}