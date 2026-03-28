"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Copy, Check, Link2, Unlink } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [connected, setConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("stripe_connections").select("connected_at").maybeSingle(),
      getToken().then((token) =>
        fetch("/api/share", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
      ),
    ]).then(([stripeRes, shareRes]) => {
      if (stripeRes.data) { setConnected(true); setConnectedAt(stripeRes.data.connected_at); }
      if (shareRes.token) setShareToken(shareRes.token);
      setLoading(false);
    });
  }, []);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  }

  async function handleGenerateShare() {
    setShareLoading(true);
    const token = await getToken();
    const res = await fetch("/api/share", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.token) setShareToken(data.token);
    setShareLoading(false);
  }

  async function handleRevokeShare() {
    const token = await getToken();
    await fetch("/api/share", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setShareToken(null);
  }

  function copyShareLink() {
    if (!shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConnect() {
    setError("");
    setSuccess("");
    const trimmedKey = keyInput.trim();
    if (!trimmedKey.startsWith("sk_")) {
      setError("Key must start with sk_live_ or sk_test_");
      return;
    }
    setSaving(true);
    const token = await getToken();
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
      setConnected(true);
      setConnectedAt(new Date().toISOString());
      setKeyInput("");
      setSuccess("Stripe connected successfully.");
    }
  }

  async function handleDisconnect() {
    setError("");
    setSuccess("");
    const token = await getToken();
    await fetch("/api/stripe/connect", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConnected(false);
    setConnectedAt(null);
    setSuccess("Stripe disconnected.");
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-10 px-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-6 space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your Stripe connection</p>
      </div>

      {/* Stripe Connection Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Stripe Account</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {connected
                ? `Connected ${connectedAt ? new Date(connectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}`
                : "Not connected"}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${connected ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {connected ? <CheckCircle2 size={13} /> : <Circle size={13} />}
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2">{success}</p>
        )}

        {connected ? (
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <Link2 size={14} /> Disconnect Stripe
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Stripe Secret Key</label>
              <input
                type="password"
                placeholder="sk_live_... or sk_test_..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value.trim())}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Found in your{" "}
                <span className="text-indigo-500">Stripe Dashboard → Developers → API keys</span>.
                Use a restricted key with read-only access for best security.
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={saving || !keyInput}
              className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Validating…" : "Connect Stripe"}
            </button>
          </div>
        )}
      </div>

      {/* Share Dashboard Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Share Dashboard</p>
          <p className="text-xs text-gray-400 mt-0.5">Generate a read-only link you can share with investors or co-founders. No login required.</p>
        </div>

        {shareToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50 focus:outline-none"
              />
              <button
                onClick={copyShareLink}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <button
              onClick={handleRevokeShare}
              className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              <Unlink size={12} /> Revoke link
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateShare}
            disabled={shareLoading}
            className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {shareLoading ? "Generating…" : "Generate share link"}
          </button>
        )}
      </div>

    </div>
  );
}
