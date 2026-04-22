"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Unlink, Plus, Trash2, Star, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Connection = { id: string; name: string; connected_at: string; isActive: boolean };
type PublicPage = { slug: string; company_name: string; tagline: string; hide_revenue: boolean; is_enabled: boolean } | null;

export default function SettingsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Public MRR page state
  const [publicPage, setPublicPage] = useState<PublicPage>(null);
  const [publicOpen, setPublicOpen] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [publicCompany, setPublicCompany] = useState("");
  const [publicTagline, setPublicTagline] = useState("");
  const [publicHideRevenue, setPublicHideRevenue] = useState(false);
  const [publicSaving, setPublicSaving] = useState(false);
  const [publicError, setPublicError] = useState("");
  const [publicCopied, setPublicCopied] = useState(false);

  // Add form
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  }

  async function loadConnections() {
    const token = await getToken();
    const res = await fetch("/api/stripe/connect", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setConnections(data.connections ?? []);
  }

  useEffect(() => {
    Promise.all([
      loadConnections().catch(() => {}),
      getToken()
        .then((token) => fetch("/api/share", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()))
        .catch(() => null),
      getToken()
        .then((token) => fetch("/api/public-page", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()))
        .catch(() => null),
    ]).then(([, shareRes, publicRes]) => {
      if (shareRes?.token) setShareToken(shareRes.token);
      if (publicRes?.page) {
        const p = publicRes.page;
        setPublicPage(p);
        setPublicSlug(p.slug);
        setPublicCompany(p.company_name);
        setPublicTagline(p.tagline);
        setPublicHideRevenue(p.hide_revenue);
      }
      setLoading(false);
    });
  }, []);

  async function handleAdd() {
    setError("");
    setSuccess("");
    const key = newKey.trim();
    if (!key.startsWith("sk_")) {
      setError("Key must start with sk_live_ or sk_test_");
      return;
    }
    setSaving(true);
    const token = await getToken();
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stripeKey: key, name: newName.trim() || "Default" }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      setError(data.error);
    } else {
      setNewName("");
      setNewKey("");
      setAddOpen(false);
      setSuccess("Account connected.");
      await loadConnections();
    }
  }

  async function handleSetActive(id: string) {
    const token = await getToken();
    await fetch("/api/stripe/connect", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    setConnections((prev) => prev.map((c) => ({ ...c, isActive: c.id === id })));
  }

  async function handleRemove(id: string) {
    const token = await getToken();
    await fetch("/api/stripe/connect", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    await loadConnections();
  }

  async function handleGenerateShare() {
    setShareLoading(true);
    const token = await getToken();
    const res = await fetch("/api/share", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.token) setShareToken(data.token);
    setShareLoading(false);
  }

  async function handleSavePublicPage() {
    setPublicError("");
    setPublicSaving(true);
    const token = await getToken();
    const res = await fetch("/api/public-page", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        slug: publicSlug,
        company_name: publicCompany,
        tagline: publicTagline,
        hide_revenue: publicHideRevenue,
        is_enabled: true,
      }),
    });
    const data = await res.json();
    setPublicSaving(false);
    if (data.error) {
      setPublicError(data.error);
    } else {
      setPublicPage(data.page);
      setPublicSlug(data.page.slug);
      setPublicOpen(false);
    }
  }

  async function handleDeletePublicPage() {
    const token = await getToken();
    await fetch("/api/public-page", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setPublicPage(null);
    setPublicSlug("");
    setPublicCompany("");
    setPublicTagline("");
    setPublicHideRevenue(false);
    setPublicOpen(false);
  }

  function copyPublicLink() {
    if (!publicPage) return;
    navigator.clipboard.writeText(`${window.location.origin}/revenue/${publicPage.slug}`);
    setPublicCopied(true);
    setTimeout(() => setPublicCopied(false), 2000);
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
        <p className="text-sm text-gray-500 mt-1">Manage your Stripe connections</p>
      </div>

      {/* Stripe Accounts Card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Stripe Accounts</p>
          <button
            onClick={() => { setAddOpen((o) => !o); setError(""); setSuccess(""); }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Plus size={13} /> Add account
          </button>
        </div>

        {/* Connection list */}
        {connections.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No Stripe accounts connected yet.</div>
        ) : (
          <ul>
            {connections.map((conn) => (
              <li key={conn.id} className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{conn.name}</p>
                    {conn.isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                        <Star size={9} /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Connected {new Date(conn.connected_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!conn.isActive && (
                    <button
                      onClick={() => handleSetActive(conn.id)}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                    >
                      Set active
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(conn.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Add form */}
        {addOpen && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-3 bg-gray-50">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Account name</label>
              <input
                type="text"
                placeholder="e.g. Main, US Store"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoComplete="off"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Stripe Secret Key</label>
              <input
                type="password"
                placeholder="sk_live_... or sk_test_..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.trim())}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoComplete="off"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Found in your{" "}
                <span className="text-indigo-500">Stripe Dashboard → Developers → API keys</span>.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newKey}
                className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Validating…" : "Connect"}
              </button>
              <button
                onClick={() => { setAddOpen(false); setError(""); }}
                className="px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="px-6 py-3 border-t border-gray-100">
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2">{success}</p>
          </div>
        )}
      </div>

      {/* Public MRR Page Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-indigo-500" />
              <p className="text-sm font-semibold text-gray-800">Public MRR Page</p>
              <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">New</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              A beautiful live revenue dashboard you can share publicly — post it on Twitter, send to investors, or embed in your README.
            </p>
          </div>
        </div>

        {publicPage ? (
          <div className="space-y-3">
            {/* Live URL */}
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/revenue/${publicPage.slug}`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50 focus:outline-none"
              />
              <button
                onClick={copyPublicLink}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {publicCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
              <a
                href={`/revenue/${publicPage.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
              >
                View →
              </a>
            </div>

            {/* Edit / Delete */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPublicOpen((o) => !o)}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
              >
                {publicOpen ? "Close" : "Edit settings"}
              </button>
              <button
                onClick={handleDeletePublicPage}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Remove page
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setPublicOpen(true)}
            disabled={publicSaving}
            className="w-full bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Create public page
          </button>
        )}

        {/* Edit form */}
        {publicOpen && (
          <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
            {publicError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{publicError}</p>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">URL slug</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-400 bg-gray-100 border border-r-0 border-gray-200 px-3 py-2.5 rounded-l-lg">revenueintelligence.co.uk/revenue/</span>
                <input
                  type="text"
                  placeholder="your-company"
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Company name</label>
              <input
                type="text"
                placeholder="Acme Inc."
                value={publicCompany}
                onChange={(e) => setPublicCompany(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">Tagline <span className="font-normal text-gray-300">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. AI analytics for e-commerce"
                value={publicTagline}
                onChange={(e) => setPublicTagline(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-gray-700 font-medium">Hide exact revenue numbers</p>
                <p className="text-xs text-gray-400 mt-0.5">Shows growth % instead of £ values — chart shape is still visible.</p>
              </div>
              <button
                onClick={() => setPublicHideRevenue((v) => !v)}
                className={`shrink-0 w-10 h-6 rounded-full transition-colors relative ml-4 ${publicHideRevenue ? "bg-indigo-600" : "bg-gray-200"}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${publicHideRevenue ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSavePublicPage}
                disabled={publicSaving || !publicSlug}
                className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {publicSaving ? "Saving…" : publicPage ? "Save changes" : "Create page"}
              </button>
              <button
                onClick={() => { setPublicOpen(false); setPublicError(""); }}
                className="px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
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
