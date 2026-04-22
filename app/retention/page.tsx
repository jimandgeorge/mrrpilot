"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cohort = { month: string; size: number; retention: (number | null)[] };

function cellClass(pct: number | null): string {
  if (pct === null) return "bg-transparent";
  if (pct >= 90) return "bg-indigo-700 text-white";
  if (pct >= 75) return "bg-indigo-500 text-white";
  if (pct >= 60) return "bg-indigo-400 text-white";
  if (pct >= 45) return "bg-indigo-200 text-indigo-900";
  if (pct >= 30) return "bg-amber-200 text-amber-900";
  if (pct >= 15) return "bg-orange-200 text-orange-900";
  return "bg-red-200 text-red-800";
}

export default function RetentionPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [maxMonths, setMaxMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try {
        const res = await fetch("/api/retention", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setCohorts(data.cohorts ?? []);
        setMaxMonths(data.maxMonths ?? 12);
      } catch {
        setError("Could not load retention data. Check your Stripe connection.");
      }
      setLoading(false);
    });
  }, []);

  // Average retention per month offset across all cohorts
  const avgRetention: (number | null)[] = Array.from({ length: maxMonths + 1 }, (_, offset) => {
    const vals = cohorts
      .map((c) => c.retention[offset])
      .filter((v): v is number => v !== null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  });

  const columns = Array.from({ length: maxMonths + 1 }, (_, i) => i);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-6">
        <div className="h-6 bg-gray-100 rounded w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-72 mb-8 animate-pulse" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-6">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!cohorts.length) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Cohort Retention</h1>
        <p className="text-sm text-gray-400">No paid invoice data found yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Cohort Retention</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          % of customers from each signup month still paying — by month since first payment
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-gray-400 font-semibold whitespace-nowrap sticky left-0 bg-white z-10 min-w-[90px]">
                Cohort
              </th>
              <th className="px-3 py-3 text-gray-400 font-semibold whitespace-nowrap min-w-[52px]">
                Size
              </th>
              {columns.map((offset) => (
                <th key={offset} className="px-3 py-3 text-gray-400 font-semibold whitespace-nowrap min-w-[52px]">
                  M{offset}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...cohorts].reverse().map((cohort, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap sticky left-0 bg-white z-10">
                  {cohort.month}
                </td>
                <td className="px-3 py-2.5 text-center text-gray-400">
                  {cohort.size}
                </td>
                {columns.map((offset) => {
                  const pct = cohort.retention[offset] ?? null;
                  return (
                    <td key={offset} className="px-1 py-1.5">
                      {pct !== null ? (
                        <div className={`rounded-md text-center py-1.5 px-1 font-semibold tabular-nums ${cellClass(pct)}`}>
                          {pct}%
                        </div>
                      ) : (
                        <div className="text-center text-gray-200 py-1.5">—</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Average row */}
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="px-4 py-2.5 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">
                Average
              </td>
              <td className="px-3 py-2.5 text-center text-gray-400">—</td>
              {columns.map((offset) => {
                const pct = avgRetention[offset];
                return (
                  <td key={offset} className="px-1 py-1.5">
                    {pct !== null ? (
                      <div className={`rounded-md text-center py-1.5 px-1 font-semibold tabular-nums ${cellClass(pct)}`}>
                        {pct}%
                      </div>
                    ) : (
                      <div className="text-center text-gray-200 py-1.5">—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-300 mt-4 text-center">
        M0 = signup month · Based on paid invoices · Annual plans show as active in payment months only
      </p>
    </div>
  );
}
