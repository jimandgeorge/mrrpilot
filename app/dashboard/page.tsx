"use client";
import { useEffect, useRef, useState } from "react";
import { HelpCircle, RefreshCw, Plug, AlertTriangle, TrendingUp, TrendingDown, UserPlus, UserMinus, AlertCircle, Lightbulb, type LucideIcon } from "lucide-react";
import Link from "next/link";

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let rafId: number;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * eased));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  return val;
}
import { supabase } from "@/lib/supabase";
import {
  ComposedChart, AreaChart, Area, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl">
      {label && <p className="text-gray-400 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        p.value != null && (
          <p key={i} style={{ color: p.stroke || p.fill || "#fff" }}>
            {p.name === "mrr" ? "Revenue" : p.name === "forecast" ? "Forecast" : p.name === "revenue" ? "Revenue" : p.name === "churns" ? "Cancellations" : p.name === "new" ? "New MRR" : p.name === "expansion" ? "Expansion" : p.name === "contraction" ? "Contraction" : p.name === "churn" ? "Churned" : p.name === "net" ? "Net New" : p.name}
            {": "}£{Number(p.value).toLocaleString("en-GB")}
          </p>
        )
      ))}
    </div>
  );
}

function MetricTooltip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1 inline-block">
      <HelpCircle size={13} className="cursor-default text-gray-300 hover:text-gray-500" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg bg-gray-900 text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-center shadow-lg">
        {text}
      </span>
    </span>
  );
}

type EventItem = {
  amount: number;
  date: Date;
  email?: string;
  customerId?: string;
  type: "new" | "renewal" | "upgrade" | "churn";
};

type Range = "7d" | "30d" | "90d" | "all";
type MrrPoint = { month: string; mrr?: number; forecast?: number };

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
const RANGE_LABEL: Record<Range, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "all": "All time",
};

export default function Home() {
  const [notConnected, setNotConnected] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("7d");
  const [rawData, setRawData] = useState<any>(null);

  const [mrr, setMrr] = useState(0);
  const [projectedMrr, setProjectedMrr] = useState(0); // pence, 3-month forecast
  const [mrrGoal, setMrrGoal] = useState(0);            // pence, user-set goal
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [commentary, setCommentary] = useState("");
  const [commentaryLoading, setCommentaryLoading] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [periodChange, setPeriodChange] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [insights, setInsights] = useState<{ icon: LucideIcon; text: string; detail?: string; type: "positive" | "warning" | "neutral" }[]>([]);
  const [churnRevenue, setChurnRevenue] = useState(0);
  const [newCustomerCount, setNewCustomerCount] = useState(0);
  const [churnTrend, setChurnTrend] = useState<{ thisPeriod: number; lastPeriod: number; reasons: { label: string; count: number }[] }>({ thisPeriod: 0, lastPeriod: 0, reasons: [] });
  const [breakdown, setBreakdown] = useState({ new: 0, upgrade: 0, renewal: 0 });
  const [mrrHistory, setMrrHistory] = useState<MrrPoint[]>([]);
  const [revenueChart, setRevenueChart] = useState<{ label: string; revenue: number }[]>([]);
  const [revenueChartTitle, setRevenueChartTitle] = useState("Revenue per Day");
  const [churnHistory, setChurnHistory] = useState<{ month: string; churns: number }[]>([]);
  const [arpu, setArpu] = useState(0);
  const [nrr, setNrr] = useState<number | null>(null);
  const [ltv, setLtv] = useState<number | null>(null);
  const [quickRatio, setQuickRatio] = useState<number | null>(null);
  const [churnRisk, setChurnRisk] = useState<{ id: string; email: string; daysPastDue: number; mrr: number; planName?: string }[]>([]);
  const [mrrWaterfall, setMrrWaterfall] = useState<{ month: string; new: number; expansion: number; contraction: number; churn: number; net: number }[]>([]);
  const [planRevenue, setPlanRevenue] = useState<{ name: string; mrr: number; customers: number; pct: number }[]>([]);
  const [pastDue, setPastDue] = useState<{ id: string; email: string; amount: number; daysOverdue: number; hostedUrl: string | null }[]>([]);
  const [userEmail, setUserEmail] = useState("");

  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [emailDrafts, setEmailDrafts] = useState<Record<string, { content: string; loading: boolean; open: boolean }>>({});

  // Load goal from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("revint_goal");
    if (saved) setMrrGoal(Number(saved));
  }, []);

  async function loadData() {
    setFetchError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setUserEmail(session.user.email);
      const res = await fetch("/api/stripe", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json();
      if (data.notConnected) { setNotConnected(true); setLoading(false); return; }
      setRawData(data);
      setPastDue(data.pastDueInvoices || []);
      setChurnRisk(data.atRiskSubscriptions || []);
    } catch {
      setFetchError(true);
      setLoading(false);
    }
    setRefreshing(false);
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (rawData) processData(rawData, range);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData, range]);

  async function fetchCommentary(metrics: object) {
    setCommentaryLoading(true);
    setCommentary("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/commentary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify(metrics),
      });
      if (!res.ok || !res.body) return;
      setCommentaryLoading(false);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setCommentary((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      // Commentary is non-critical — fail silently
    }
    setCommentaryLoading(false);
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatStreaming) return;

    const newMessages = [...chatMessages, { role: "user" as const, content: text }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const context = {
        mrr, arr: mrr * 12, arpu, nrr, growthRate, churnRate, churnRevenue,
        projectedMrr, newCustomers: newCustomerCount, breakdown,
        churnTrend: { thisPeriod: churnTrend.thisPeriod, lastPeriod: churnTrend.lastPeriod },
        churnRisk: churnRisk.map(c => ({ email: c.email, mrr: c.mrr, daysPastDue: c.daysPastDue })),
        planRevenue,
        recentEvents: events.slice(0, 20).map(e => ({
          email: e.email ?? "", type: e.type, amount: e.amount,
          date: e.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        })),
        range,
      };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ messages: newMessages, context }),
      });
      if (!res.ok || !res.body) return;

      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setChatMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: updated[updated.length - 1].content + chunk };
          return updated;
        });
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      // fail silently
    }
    setChatStreaming(false);
  }

  async function draftEmail(customerId: string, email: string, plan: string, mrrVal: number, daysPastDue: number) {
    setEmailDrafts(prev => ({ ...prev, [customerId]: { content: "", loading: true, open: true } }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const customer = (rawData?.customers || []).find((c: any) => c.id === customerId);
      const monthsAsCustomer = customer ? Math.max(1, Math.round(customer.payments)) : 1;
      const totalPaid = customer ? customer.total : 0;
      const res = await fetch("/api/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ email, plan, mrr: mrrVal, daysPastDue, monthsAsCustomer, totalPaid }),
      });
      if (!res.ok || !res.body) { setEmailDrafts(prev => ({ ...prev, [customerId]: { content: "Failed to generate email.", loading: false, open: true } })); return; }
      setEmailDrafts(prev => ({ ...prev, [customerId]: { ...prev[customerId], loading: false } }));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setEmailDrafts(prev => ({ ...prev, [customerId]: { ...prev[customerId], content: prev[customerId].content + decoder.decode(value, { stream: true }) } }));
      }
    } catch {
      setEmailDrafts(prev => ({ ...prev, [customerId]: { content: "Failed to generate email.", loading: false, open: true } }));
    }
  }

  function saveGoal() {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0) {
      const pence = Math.round(val * 100);
      setMrrGoal(pence);
      localStorage.setItem("revint_goal", String(pence));
    }
    setEditingGoal(false);
    setGoalInput("");
  }

  function processData(data: any, selectedRange: Range) {
    const invoices = data.invoices || [];
    const stripeEvents = data.events || [];
    const churnEventsData: any[] = data.churnEvents || [];

    const now = new Date();
    const periodStart = selectedRange === "all"
      ? new Date(0)
      : new Date(now.getTime() - RANGE_DAYS[selectedRange] * 86400000);
    const prevPeriodStart = selectedRange === "all"
      ? new Date(0)
      : new Date(periodStart.getTime() - (now.getTime() - periodStart.getTime()));

    // Customer ID → email map
    const customerEmailMap: Record<string, string> = {};
    invoices.forEach((inv: any) => {
      if (inv.customer && inv.customer_email) customerEmailMap[inv.customer] = inv.customer_email;
    });

    // MRR — sourced from active subscription data (prices are expanded there, not on invoice line items)
    const mrrByCustomer: Record<string, { mrr: number; planName: string; priceId: string }> = data.mrrByCustomer || {};
    let totalMRR = 0;
    Object.values(mrrByCustomer).forEach((c: any) => { totalMRR += c.mrr; });

    // Still need latestByCustomer for invoice-based calculations (NRR, waterfall, breakdown)
    const churnedIdSet = new Set<string>(
      (data.customers || []).filter((c: any) => c.churned).map((c: any) => c.id)
    );
    const latestByCustomer: Record<string, any> = {};
    invoices.forEach((inv: any) => {
      const customerId = inv.customer;
      if (!customerId) return;
      if (churnedIdSet.has(customerId)) return;
      if (!latestByCustomer[customerId] || inv.created > latestByCustomer[customerId].created) {
        latestByCustomer[customerId] = inv;
      }
    });

    // ARPU
    const activeCustomerCount = Object.keys(mrrByCustomer).length;
    const calcArpu = activeCustomerCount > 0 ? Math.round(totalMRR / activeCustomerCount) : 0;

    // LTV = ARPU / monthly churn rate (churns last 30 days / active customers)
    const nowForLtv = Math.floor(Date.now() / 1000);
    const recentChurnCount = churnEventsData.filter((e: any) => (nowForLtv - e.cancelledAt) < 30 * 86400).length;
    const monthlyChurnRate = activeCustomerCount > 0 ? recentChurnCount / activeCustomerCount : 0;
    const calcLtv = monthlyChurnRate > 0 ? Math.round(calcArpu / monthlyChurnRate) : null;

    // Revenue by plan — sourced from subscription data
    const planMap: Record<string, { name: string; mrr: number; customers: number }> = {};
    Object.values(mrrByCustomer).forEach((c: any) => {
      const key = c.priceId || "unknown";
      if (!planMap[key]) planMap[key] = { name: c.planName, mrr: 0, customers: 0 };
      planMap[key].mrr += c.mrr;
      planMap[key].customers += 1;
    });
    const planTotal = Object.values(planMap).reduce((s, p) => s + p.mrr, 0);
    const calcPlanRevenue = Object.values(planMap)
      .map((p) => ({ ...p, pct: planTotal > 0 ? Math.round((p.mrr / planTotal) * 100) : 0 }))
      .sort((a, b) => b.mrr - a.mrr);

    // NRR — compare MRR from last month's cohort vs this month
    // "Last month" = 30–60 days ago; "this month" = 0–30 days ago
    const nowTs = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = nowTs - 30 * 24 * 60 * 60;
    const sixtyDaysAgo = nowTs - 60 * 24 * 60 * 60;

    // Customers who had a paid invoice last month
    const lastMonthCustomers = new Set<string>();
    invoices.forEach((inv: any) => {
      if (inv.customer && inv.amount_paid > 0 && inv.created >= sixtyDaysAgo && inv.created < thirtyDaysAgo) {
        lastMonthCustomers.add(inv.customer);
      }
    });

    // For each, compute their MRR last month and this month
    const mrrLastMonth: Record<string, number> = {};
    const mrrThisMonth: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      const id = inv.customer;
      if (!id || !inv.amount_paid) return;
      const line = inv.lines?.data?.[0];
      const interval = line?.price?.recurring?.interval;
      const intervalCount = line?.price?.recurring?.interval_count || 1;
      let monthly = inv.amount_paid;
      if (interval === "year") monthly = Math.round(monthly / (12 * intervalCount));
      else if (interval === "week") monthly = Math.round((monthly * 52) / (12 * intervalCount));
      else monthly = Math.round(monthly / intervalCount);

      if (inv.created >= sixtyDaysAgo && inv.created < thirtyDaysAgo) {
        mrrLastMonth[id] = (mrrLastMonth[id] || 0) + monthly;
      }
      if (inv.created >= thirtyDaysAgo) {
        mrrThisMonth[id] = (mrrThisMonth[id] || 0) + monthly;
      }
    });

    let startingMrr = 0, retainedMrr = 0;
    lastMonthCustomers.forEach((id) => {
      startingMrr += mrrLastMonth[id] || 0;
      retainedMrr += mrrThisMonth[id] || 0; // 0 if churned, higher if expanded
    });
    const calcNrr = startingMrr > 0 ? Math.round((retainedMrr / startingMrr) * 100) : null;


    // MRR Waterfall — monthly MRR per customer, then classify movements
    const monthCustomerMrr: Record<string, Record<string, number>> = {};
    invoices.forEach((inv: any) => {
      if (!inv.amount_paid || !inv.customer) return;
      const d = new Date(inv.created * 1000);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const line = inv.lines?.data?.[0];
      const interval = line?.price?.recurring?.interval;
      const ic = line?.price?.recurring?.interval_count || 1;
      let mo = inv.amount_paid;
      if (interval === "year") mo = Math.round(mo / (12 * ic));
      else if (interval === "week") mo = Math.round((mo * 52) / (12 * ic));
      else mo = Math.round(mo / ic);
      if (!monthCustomerMrr[mk]) monthCustomerMrr[mk] = {};
      if (!monthCustomerMrr[mk][inv.customer] || mo > monthCustomerMrr[mk][inv.customer])
        monthCustomerMrr[mk][inv.customer] = mo;
    });
    const wfMonths = Object.keys(monthCustomerMrr).sort();
    const calcWaterfall = wfMonths.slice(-12).map((month, idx, arr) => {
      const prev = idx > 0 ? monthCustomerMrr[arr[idx - 1]] : {};
      const cur = monthCustomerMrr[month];
      let newMrr = 0, expansion = 0, contraction = 0, churnMrr = 0;
      Object.entries(cur).forEach(([cid, mrr]) => {
        if (!prev[cid]) newMrr += mrr;
        else if (mrr > prev[cid]) expansion += mrr - prev[cid];
        else if (mrr < prev[cid]) contraction += mrr - prev[cid];
      });
      Object.entries(prev).forEach(([cid, mrr]) => { if (!cur[cid]) churnMrr -= mrr; });
      return {
        month: new Date(month + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        new: Math.round(newMrr / 100),
        expansion: Math.round(expansion / 100),
        contraction: Math.round(contraction / 100),
        churn: Math.round(churnMrr / 100),
        net: Math.round((newMrr + expansion + contraction + churnMrr) / 100),
      };
    });

    // Quick Ratio = (New + Expansion) / (|Contraction| + |Churn|) for last complete month
    let calcQuickRatio: number | null = null;
    if (calcWaterfall.length >= 2) {
      const lm = calcWaterfall[calcWaterfall.length - 2];
      const pos = lm.new + lm.expansion;
      const neg = Math.abs(lm.contraction) + Math.abs(lm.churn);
      calcQuickRatio = neg > 0 ? Math.round((pos / neg) * 10) / 10 : (pos > 0 ? null : null);
    }

    // Event timeline
    const sortedInvoices = [...invoices].sort((a: any, b: any) => a.created - b.created);
    const seenCustomers = new Set<string>(); // tracks customer IDs
    const parsedEvents: EventItem[] = sortedInvoices.map((inv: any) => {
      const customerId = inv.customer;
      const email = inv.customer_email || "Unknown";
      const amount = inv.amount_paid;
      const date = new Date(inv.created * 1000);
      let type: EventItem["type"] = "renewal";
      if (customerId && !seenCustomers.has(customerId)) { type = "new"; seenCustomers.add(customerId); }
      if (inv.billing_reason === "subscription_update") type = "upgrade";
      return { amount, date, email, customerId, type };
    });
    const churnedCustomers = new Set<string>();
    stripeEvents.forEach((evt: any) => {
      if (evt.type === "customer.subscription.deleted") {
        const customerId = evt.data.object.customer;
        if (!churnedCustomers.has(customerId)) {
          churnedCustomers.add(customerId);
          parsedEvents.push({
            amount: evt.data.object.items?.data?.[0]?.price?.unit_amount ?? 0,
            date: new Date(evt.created * 1000),
            email: customerEmailMap[customerId] || "Unknown",
            customerId,
            type: "churn",
          });
        }
      }
    });
    parsedEvents.sort((a, b) => {
      if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime();
      if (a.type === "new") return -1;
      if (b.type === "new") return 1;
      return 0;
    });

    // Period revenue breakdown
    let periodRevenue = 0, churnAmount = 0, newRevenue = 0, upgradeRevenue = 0, renewalRevenue = 0;
    const countedNew: Record<string, boolean> = {};
    parsedEvents.forEach((event) => {
      if (event.date >= periodStart) {
        if (event.type === "churn") { periodRevenue -= event.amount; churnAmount += event.amount; }
        else periodRevenue += event.amount;
        if (event.type === "new" && !countedNew[event.email || "unknown"]) {
          newRevenue += event.amount; countedNew[event.email || "unknown"] = true;
        }
        if (event.type === "upgrade") upgradeRevenue += event.amount;
        if (event.type === "renewal") renewalRevenue += event.amount;
      }
    });

    // Churn rate
    const customersBeforePeriod = new Set<string>();
    const churnedThisPeriod = new Set<string>();
    parsedEvents.forEach((event) => {
      if (!event.customerId) return;
      if (event.date < periodStart && event.type !== "churn") customersBeforePeriod.add(event.customerId);
      if (event.date >= periodStart && event.type === "churn") churnedThisPeriod.add(event.customerId);
    });
    const churn = customersBeforePeriod.size > 0
      ? (churnedThisPeriod.size / customersBeforePeriod.size) * 100 : 0;
    const growth = totalMRR > 0 ? Math.min((periodRevenue / totalMRR) * 100, 100) : 0;
    const newCustomers = Object.keys(countedNew).length;

    // Revenue chart (range-aware)
    let chartData: { label: string; revenue: number }[] = [];
    let chartTitle = "Revenue per Day";
    if (selectedRange === "7d") {
      const dailyMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dailyMap[d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })] = 0;
      }
      invoices.forEach((inv: any) => {
        if (!inv.amount_paid) return;
        const key = new Date(inv.created * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        if (key in dailyMap) dailyMap[key] += inv.amount_paid;
      });
      chartData = Object.entries(dailyMap).map(([label, revenue]) => ({ label, revenue: Math.round(revenue / 100) }));
      chartTitle = "Revenue per Day · last 14 days";
    } else if (selectedRange === "30d") {
      const dailyMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dailyMap[d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })] = 0;
      }
      invoices.forEach((inv: any) => {
        if (!inv.amount_paid) return;
        const key = new Date(inv.created * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        if (key in dailyMap) dailyMap[key] += inv.amount_paid;
      });
      chartData = Object.entries(dailyMap).map(([label, revenue]) => ({ label, revenue: Math.round(revenue / 100) }));
      chartTitle = "Revenue per Day · last 30 days";
    } else if (selectedRange === "90d") {
      const buckets: { label: string; start: number; revenue: number }[] = [];
      for (let i = 12; i >= 0; i--) {
        const start = new Date(); start.setDate(start.getDate() - (i + 1) * 7);
        const end = new Date(); end.setDate(end.getDate() - i * 7);
        const bucket = { label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), start: start.getTime(), revenue: 0 };
        invoices.forEach((inv: any) => {
          if (!inv.amount_paid) return;
          const ts = inv.created * 1000;
          if (ts >= start.getTime() && ts < end.getTime()) bucket.revenue += inv.amount_paid;
        });
        buckets.push(bucket);
      }
      chartData = buckets.map(({ label, revenue }) => ({ label, revenue: Math.round(revenue / 100) }));
      chartTitle = "Revenue by Week · last 90 days";
    } else {
      const byMonth: Record<string, number> = {};
      invoices.forEach((inv: any) => {
        if (!inv.amount_paid) return;
        const d = new Date(inv.created * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        byMonth[key] = (byMonth[key] || 0) + inv.amount_paid;
      });
      chartData = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, revenue]) => ({
          label: new Date(key + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
          revenue: Math.round(revenue / 100),
        }));
      chartTitle = "Revenue by Month · all time";
    }

    // Insights
    type Insight = { icon: LucideIcon; text: string; detail?: string; type: "positive" | "warning" | "neutral" };
    const insightList: Insight[] = [];
    const pLabel = RANGE_LABEL[selectedRange].toLowerCase();
    if (newCustomers > 0) {
      insightList.push({ icon: UserPlus, text: `${newCustomers} new customer${newCustomers > 1 ? "s" : ""} ${pLabel}`, detail: "Send a welcome email in the first 24 hours — it's the highest-leverage retention action.", type: "positive" });
    } else {
      insightList.push({ icon: Lightbulb, text: `No new customers ${pLabel}`, detail: "Consider a short-term promotion or ask existing customers for referrals.", type: "neutral" });
    }
    if (churnAmount > 0) {
      insightList.push({ icon: UserMinus, text: `£${(churnAmount / 100).toFixed(2)} lost to churn ${pLabel}`, detail: "Email churned customers within 48 hours — win-back rates drop sharply after that.", type: "warning" });
    }
    if (upgradeRevenue === 0 && totalMRR > 0) {
      insightList.push({ icon: Lightbulb, text: `No upgrades ${pLabel}`, detail: "Highlight your higher-tier plan on the next login or billing email.", type: "neutral" });
    }
    if (periodRevenue > 0 && growth > 20) {
      insightList.push({ icon: TrendingUp, text: `Revenue up ${growth.toFixed(0)}% vs MRR ${pLabel}`, detail: "Strong growth. Double down on whatever acquisition channel is working.", type: "positive" });
    }

    // MRR history (monthly, always) — used for the main trend chart
    const byMonth: Record<string, number> = {};
    invoices.forEach((inv: any) => {
      if (!inv.amount_paid) return;
      const d = new Date(inv.created * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const line = inv.lines?.data?.[0];
      const interval = line?.price?.recurring?.interval;
      const intervalCount = line?.price?.recurring?.interval_count || 1;
      let monthly = inv.amount_paid;
      if (interval === "year") monthly = Math.round(monthly / (12 * intervalCount));
      else if (interval === "week") monthly = Math.round((monthly * 52) / (12 * intervalCount));
      byMonth[key] = (byMonth[key] || 0) + monthly;
    });
    const history: MrrPoint[] = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        month: new Date(key + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        mrr: Math.round(val / 100),
      }));

    // 📈 Forecast — linear regression on last 6 months
    let forecastedMrr = 0;
    if (history.length >= 2) {
      const recent = history.slice(-6);
      const n = recent.length;
      const sumX = recent.reduce((s, _, i) => s + i, 0);
      const sumY = recent.reduce((s, m) => s + (m.mrr ?? 0), 0);
      const sumXY = recent.reduce((s, m, i) => s + i * (m.mrr ?? 0), 0);
      const sumX2 = recent.reduce((s, _, i) => s + i * i, 0);
      const denom = n * sumX2 - sumX * sumX;
      const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
      const intercept = (sumY - slope * sumX) / n;

      // Project 3 months out (relative to last data point index n-1)
      const projected3mo = Math.max(0, Math.round(intercept + slope * (n - 1 + 3)));
      forecastedMrr = projected3mo * 100; // convert to pence for state

      // Attach forecast to last actual point (smooth join) + 3 future months
      const historyWithForecast: MrrPoint[] = history.map((m, i) => ({
        ...m,
        forecast: i === history.length - 1 ? m.mrr : undefined,
      }));

      // Compute future month labels
      const lastDate = new Date();
      for (let offset = 1; offset <= 3; offset++) {
        const d = new Date(lastDate);
        d.setMonth(d.getMonth() + offset);
        const forecastVal = Math.max(0, Math.round(intercept + slope * (n - 1 + offset)));
        historyWithForecast.push({
          month: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
          mrr: undefined,
          forecast: forecastVal,
        });
      }
      setMrrHistory(historyWithForecast);
    } else {
      setMrrHistory(history);
    }
    setProjectedMrr(forecastedMrr);

    // Churn trend
    const churnsThisPeriod = churnEventsData.filter((e) => new Date(e.cancelledAt * 1000) >= periodStart);
    const churnsLastPeriod = selectedRange !== "all"
      ? churnEventsData.filter((e) => { const d = new Date(e.cancelledAt * 1000); return d >= prevPeriodStart && d < periodStart; })
      : [];
    const reasonCounts: Record<string, number> = {};
    churnEventsData.forEach((e) => {
      if (selectedRange === "all" || new Date(e.cancelledAt * 1000) >= periodStart) {
        const label = e.label || "Unknown";
        reasonCounts[label] = (reasonCounts[label] || 0) + 1;
      }
    });
    const reasons = Object.entries(reasonCounts).sort(([, a], [, b]) => b - a).map(([label, count]) => ({ label, count }));

    if (churnsThisPeriod.length > 0 || churnsLastPeriod.length > 0) {
      const trendDiff = churnsThisPeriod.length - churnsLastPeriod.length;
      if (trendDiff > 0) insightList.push({ icon: AlertCircle, text: `Churn up ${churnsLastPeriod.length} → ${churnsThisPeriod.length} vs previous period`, detail: "Look for a pattern — pricing change, competitor, or onboarding issue.", type: "warning" });
      else if (trendDiff < 0) insightList.push({ icon: TrendingDown, text: `Churn down ${churnsLastPeriod.length} → ${churnsThisPeriod.length} vs previous period`, detail: "Retention is improving. Identify what changed and reinforce it.", type: "positive" });
    }

    // Churn history (monthly)
    const churnByMonth: Record<string, number> = {};
    churnEventsData.forEach((e: any) => {
      const d = new Date(e.cancelledAt * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      churnByMonth[key] = (churnByMonth[key] || 0) + 1;
    });
    const churnHist = Object.entries(churnByMonth).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ month: new Date(key + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), churns: count }));

    setMrr(totalMRR);
    setArpu(calcArpu);
    setNrr(calcNrr);
    setLtv(calcLtv);
    setQuickRatio(calcQuickRatio);
    // churnRisk is set directly from atRiskSubscriptions in loadData
    setMrrWaterfall(calcWaterfall);
    setPlanRevenue(calcPlanRevenue);
    setNewCustomerCount(newCustomers);
    setEvents(parsedEvents);
    setPeriodChange(periodRevenue);
    setChurnRate(churn);
    setGrowthRate(growth);
    setInsights(insightList);
    setChurnRevenue(churnAmount);
    setChurnTrend({ thisPeriod: churnsThisPeriod.length, lastPeriod: churnsLastPeriod.length, reasons });
    setBreakdown({ new: newRevenue, upgrade: upgradeRevenue, renewal: renewalRevenue });
    setRevenueChart(chartData);
    setRevenueChartTitle(chartTitle);
    setChurnHistory(churnHist);
    setLoading(false);

    // Fire commentary fetch — non-blocking
    fetchCommentary({
      mrr: totalMRR,
      projectedMrr: forecastedMrr,
      periodChange: periodRevenue,
      growthRate: growth,
      churnRate: churn,
      churnRevenue: churnAmount,
      churnCount: churnedThisPeriod.size,
      newCustomers,
      range: selectedRange,
      breakdown: { new: newRevenue, renewal: renewalRevenue, upgrade: upgradeRevenue },
      churnTrend: { thisPeriod: churnsThisPeriod.length, lastPeriod: churnsLastPeriod.length },
      churnRisk: churnRisk.map(c => ({ email: c.email, daysPastDue: c.daysPastDue, mrr: c.mrr })),
    });
  }

  // Animated counters — after all useState declarations, before any early returns
  const animatedMrr = useCountUp(Math.round(mrr / 100));
  const animatedGrowth = useCountUp(Math.round(Math.abs(growthRate) * 10));
  const animatedChurn = useCountUp(Math.round(Math.abs(churnRate) * 10));

  if (notConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4"><Plug size={22} className="text-gray-400" /></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect your Stripe account</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-xs">Add your Stripe secret key in Settings to start seeing your revenue data.</p>
        <a href="/settings" className="bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">Go to Settings →</a>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><AlertTriangle size={22} className="text-red-400" /></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load data</h2>
        <p className="text-sm text-gray-400 mb-6">Could not reach the Stripe API. Check your key in Settings or try again.</p>
        <button onClick={() => { setLoading(true); loadData(); }} className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-80 transition-opacity">Retry</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const typeConfig = {
    new:     { label: "New",     border: "border-l-green-400",  pill: "bg-green-50 text-green-700"   },
    renewal: { label: "Renewal", border: "border-l-blue-300",   pill: "bg-blue-50 text-blue-600"     },
    upgrade: { label: "Upgrade", border: "border-l-purple-400", pill: "bg-purple-50 text-purple-700" },
    churn:   { label: "Churned", border: "border-l-red-300",    pill: "bg-red-50 text-red-600"       },
  };

  const rangeOptions: { key: Range; label: string }[] = [
    { key: "7d", label: "7d" }, { key: "30d", label: "30d" },
    { key: "90d", label: "90d" }, { key: "all", label: "All" },
  ];

  const goalPct = mrrGoal > 0 ? Math.min(100, (mrr / mrrGoal) * 100) : 0;
  const onTrack = projectedMrr >= mrrGoal && mrrGoal > 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = userEmail ? userEmail.split("@")[0].replace(/[._-]/g, " ").split(" ")[0] : "";
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "";
  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 space-y-4">

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{greeting}{displayName ? `, ${displayName}` : ""}.</h1>
          <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
            {rangeOptions.map((opt) => (
              <button key={opt.key} onClick={() => setRange(opt.key)}
                className={`px-3 py-1.5 transition-colors ${range === opt.key ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setRefreshing(true); loadData(); }} disabled={refreshing}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={`inline mr-1 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Briefing — the hero */}
      <div className="bg-white rounded-2xl border border-gray-200 p-7">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">Your briefing</p>
          {commentary && !commentaryLoading && (
            <button
              onClick={() => fetchCommentary({
                mrr, projectedMrr, periodChange, growthRate, churnRate, churnRevenue,
                churnCount: churnTrend.thisPeriod, newCustomers: newCustomerCount, range, breakdown,
                churnTrend: { thisPeriod: churnTrend.thisPeriod, lastPeriod: churnTrend.lastPeriod },
                churnRisk: churnRisk.map(c => ({ email: c.email, daysPastDue: c.daysPastDue, mrr: c.mrr })),
              })}
              className="text-xs text-gray-300 hover:text-indigo-500 transition-colors flex items-center gap-1"
            >
              <RefreshCw size={11} /> Refresh
            </button>
          )}
        </div>
        {commentaryLoading ? (
          <div className="space-y-3 animate-pulse">
            <p className="text-xs text-gray-400 mb-4">Analysing your revenue…</p>
            <div className="h-5 bg-gray-100 rounded-lg w-full" />
            <div className="h-5 bg-gray-100 rounded-lg w-11/12" />
            <div className="h-5 bg-gray-100 rounded-lg w-4/5" />
            <div className="h-5 bg-gray-100 rounded-lg w-3/5" />
          </div>
        ) : commentary ? (
          <p className="text-[17px] leading-relaxed text-gray-800">{commentary}</p>
        ) : null}

        {/* Chat thread */}
        {chatMessages.length > 0 && (
          <div className="mt-6 space-y-4 border-t border-gray-100 pt-5">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "text-gray-800"
                }`}>
                  {msg.content}
                  {msg.role === "assistant" && chatStreaming && i === chatMessages.length - 1 && (
                    <span className="inline-block w-1 h-3.5 bg-gray-400 ml-0.5 animate-pulse rounded-sm" />
                  )}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
        )}

        {/* Chat input */}
        <form onSubmit={sendChat} className="mt-4 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Who should I reach out to today?"
            disabled={chatStreaming}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 placeholder:text-gray-300"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || chatStreaming}
            className="text-sm font-medium bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      </div>

      {/* Urgent callouts — conversational */}
      {pastDue.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-5 py-3.5">
          <p className="text-sm text-red-800 leading-relaxed">
            <span className="font-semibold">{inv.email}</span> has a payment {inv.daysOverdue} day{inv.daysOverdue !== 1 ? "s" : ""} overdue — £{(inv.amount / 100).toFixed(0)} at risk.
          </p>
          {inv.hostedUrl && (
            <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 ml-4 transition-colors">
              Retry payment →
            </a>
          )}
        </div>
      ))}
      {churnRisk.map((c) => {
        const draft = emailDrafts[c.id];
        const planName = c.planName || (rawData?.mrrByCustomer?.[c.id]?.planName) || "Unknown";
        return (
          <div key={c.id} className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5">
              <p className="text-sm text-amber-900 leading-relaxed">
                <span className="font-semibold">{c.email}</span> subscription is past due{c.daysPastDue > 0 ? ` · ${c.daysPastDue} day${c.daysPastDue !== 1 ? "s" : ""} overdue` : ""} — reach out before they cancel.
              </p>
              <div className="shrink-0 flex items-center gap-3 ml-4">
                <button
                  onClick={() => {
                    if (draft?.open) {
                      setEmailDrafts(prev => ({ ...prev, [c.id]: { ...prev[c.id], open: false } }));
                    } else if (draft?.content) {
                      setEmailDrafts(prev => ({ ...prev, [c.id]: { ...prev[c.id], open: true } }));
                    } else {
                      draftEmail(c.id, c.email, planName, c.mrr, c.daysPastDue);
                    }
                  }}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                >
                  {draft?.loading ? "Writing…" : draft?.open ? "Hide draft" : draft?.content ? "Show draft" : "Draft email →"}
                </button>
                <Link href={`/customers/${c.id}`} className="text-xs font-semibold text-amber-600 hover:text-amber-800 transition-colors">View →</Link>
              </div>
            </div>
            {draft?.open && (
              <div className="border-t border-amber-100 bg-white px-5 py-4">
                {draft.loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-11/12" />
                    <div className="h-4 bg-gray-100 rounded w-4/5" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{draft.content}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => { navigator.clipboard.writeText(draft.content); }}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Copy to clipboard
                      </button>
                      <button
                        onClick={() => draftEmail(c.id, c.email, planName, c.mrr, c.daysPastDue)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        Regenerate
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Numbers strip */}
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 flex items-center divide-x divide-gray-100 overflow-x-auto">
        {[
          { label: "MRR",         value: `£${(mrr / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`,           sub: `${periodChange >= 0 ? "+" : "−"}£${(Math.abs(periodChange) / 100).toFixed(0)} ${RANGE_LABEL[range].toLowerCase()}` },
          { label: "ARR",         value: `£${((mrr * 12) / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`,    sub: undefined },
          { label: "ARPU",        value: `£${(arpu / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`,          sub: undefined },
          { label: "NRR",         value: nrr !== null ? `${nrr}%` : "—",                                                    color: nrr !== null ? (nrr >= 100 ? "text-green-600" : nrr >= 80 ? "text-amber-500" : "text-red-500") : "text-gray-300" },
          { label: "Quick Ratio", value: quickRatio !== null ? String(quickRatio) : "—",                                    color: quickRatio !== null ? (quickRatio >= 4 ? "text-green-600" : quickRatio >= 2 ? "text-amber-500" : "text-red-500") : "text-gray-300" },
        ].map((m, i) => (
          <div key={i} className="flex-1 min-w-[100px] px-4 first:pl-0 last:pr-0 text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{m.label}</p>
            <p className={`text-base font-bold tabular-nums ${m.color ?? "text-gray-900"}`}>{m.value}</p>
            {m.sub && <p className="text-[11px] text-gray-400 mt-0.5">{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* MRR goal */}
      {(mrrGoal > 0 || editingGoal) && !editingGoal && (
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
            <span>MRR goal: £{(mrrGoal / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}{onTrack && <span className="ml-2 text-green-600 font-medium">· On track ✓</span>}</span>
            <span className={`font-medium ${goalPct >= 100 ? "text-green-600" : "text-gray-500"}`}>{goalPct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${goalPct >= 100 ? "bg-green-500" : "bg-indigo-500"}`} style={{ width: `${goalPct}%` }} />
          </div>
          <button onClick={() => { setEditingGoal(true); setGoalInput(String(mrrGoal / 100)); }} className="mt-2 text-xs text-gray-300 hover:text-indigo-500 transition-colors">Edit goal</button>
        </div>
      )}
      {editingGoal && (
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 flex gap-2">
          <input type="number" placeholder="MRR goal in £" value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") { setEditingGoal(false); setGoalInput(""); } }}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" autoFocus />
          <button onClick={saveGoal} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">Save</button>
          {mrrGoal > 0 && <button onClick={() => { setMrrGoal(0); localStorage.removeItem("revint_goal"); setEditingGoal(false); }} className="text-xs text-red-400 hover:text-red-600 px-2">Remove</button>}
          <button onClick={() => { setEditingGoal(false); setGoalInput(""); }} className="text-xs text-gray-400 px-2">✕</button>
        </div>
      )}
      {!mrrGoal && !editingGoal && (
        <button onClick={() => setEditingGoal(true)} className="text-xs text-gray-300 hover:text-indigo-500 transition-colors pl-1">+ Set MRR goal</button>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-gray-100" />
        <p className="text-[11px] font-medium text-gray-300 tracking-widest uppercase">The numbers</p>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-1.5 mb-4">
          <p className="text-xs font-semibold text-gray-500">Revenue Breakdown</p>
          <span className="text-xs text-gray-300">· {RANGE_LABEL[range]}</span>
          <MetricTooltip text="Revenue in the selected period split by type: first payments from new customers, plan upgrades, and recurring renewals." />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "New customers", value: breakdown.new,     color: "text-green-600" },
            { label: "Renewals",      value: breakdown.renewal, color: "text-blue-500"  },
            { label: "Upgrades",      value: breakdown.upgrade, color: "text-purple-600"},
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className={`text-2xl font-semibold ${item.color}`}>£{(item.value / 100).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by Plan */}
      {planRevenue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-1.5 mb-5">
            <p className="text-xs font-semibold text-gray-500">Revenue by Plan</p>
            <MetricTooltip text="MRR split by Stripe price. Shows which plans are driving your revenue." />
          </div>
          <div className="space-y-4">
            {planRevenue.map((plan, i) => {
              const barColors = ["bg-indigo-500", "bg-purple-500", "bg-blue-400", "bg-cyan-400", "bg-teal-400"];
              const color = barColors[i % barColors.length];
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-sm inline-block ${color}`} />
                      <p className="text-sm font-medium text-gray-700">{plan.name}</p>
                      <span className="text-xs text-gray-400">{plan.customers} customer{plan.customers !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-gray-700 tabular-nums">£{(plan.mrr / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}<span className="text-xs text-gray-400 font-normal">/mo</span></p>
                      <p className="text-xs text-gray-400 w-8 text-right">{plan.pct}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${plan.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MRR Waterfall */}
      {mrrWaterfall.length >= 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-gray-500">MRR Movement</p>
              <MetricTooltip text="Month-over-month breakdown of MRR changes: new customers, expansions, contractions, and churn." />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              {[
                { color: "bg-green-500",  label: "New"         },
                { color: "bg-indigo-500", label: "Expansion"   },
                { color: "bg-orange-400", label: "Contraction" },
                { color: "bg-red-400",    label: "Churn"       },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-sm inline-block ${color}`} />{label}
                </span>
              ))}
            </div>
          </div>
          {/* Last month summary */}
          {(() => {
            const last = mrrWaterfall[mrrWaterfall.length - 1];
            const items = [
              { label: "New",         value: last.new,         color: "text-green-600"  },
              { label: "Expansion",   value: last.expansion,   color: "text-indigo-600" },
              { label: "Contraction", value: last.contraction, color: "text-orange-500" },
              { label: "Churn",       value: last.churn,       color: "text-red-500"    },
            ];
            return (
              <div className="flex gap-6 mt-3 mb-4 pb-4 border-b border-gray-100">
                {items.map((item) => (
                  <div key={item.label}>
                    <p className="text-[11px] text-gray-400">{item.label}</p>
                    <p className={`text-sm font-semibold tabular-nums ${item.color}`}>
                      {item.value >= 0 ? "+" : ""}£{Math.abs(item.value).toLocaleString("en-GB")}
                    </p>
                  </div>
                ))}
                <div className="ml-auto text-right">
                  <p className="text-[11px] text-gray-400">Net new</p>
                  <p className={`text-sm font-semibold tabular-nums ${last.net >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {last.net >= 0 ? "+" : ""}£{last.net.toLocaleString("en-GB")}
                  </p>
                </div>
              </div>
            );
          })()}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mrrWaterfall} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={45} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="new"         stackId="a" fill="#22c55e" radius={[0,0,0,0]} />
              <Bar dataKey="expansion"   stackId="a" fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="contraction" stackId="b" fill="#fb923c" radius={[0,0,0,0]} />
              <Bar dataKey="churn"       stackId="b" fill="#f87171" radius={[0,0,3,3]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* MRR + Forecast */}
        {mrrHistory.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500">Revenue by Month</p>
              {projectedMrr > 0 && (
                <span className="text-[11px] text-gray-300 flex items-center gap-1.5">
                  <svg width="20" height="4" viewBox="0 0 20 4"><line x1="0" y1="2" x2="20" y2="2" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="4 2"/></svg>
                  Forecast
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={mrrHistory}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={45} />
                <Tooltip content={<ChartTooltip />} />
                {mrrGoal > 0 && (
                  <ReferenceLine y={mrrGoal / 100} stroke="#6366f1" strokeDasharray="3 3" strokeOpacity={0.4}
                    label={{ value: "Goal", position: "right", fontSize: 10, fill: "#6366f1" }} />
                )}
                <Area type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2} fill="url(#mrrGrad)" connectNulls={false} dot={false} />
                <Line type="monotone" dataKey="forecast" stroke="#a5b4fc" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue per period */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <p className="text-xs font-semibold text-gray-500 mb-4">
            {revenueChartTitle.split(" · ")[0]}
            {revenueChartTitle.includes(" · ") && (
              <span className="normal-case font-normal text-gray-300"> · {revenueChartTitle.split(" · ")[1]}</span>
            )}
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={revenueChart} barCategoryGap="35%">
              <CartesianGrid vertical={false} stroke="#f4f4f5" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={range === "30d" ? 4 : 1} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} width={45} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Churn over Time */}
      {churnHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
          <p className="text-xs font-semibold text-gray-500 mb-4">Churn over Time</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={churnHistory}>
              <defs>
                <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#fef2f2" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="churns" stroke="#ef4444" strokeWidth={2} fill="url(#churnGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Churn Intelligence */}
      {(churnRevenue > 0 || churnTrend.thisPeriod > 0 || churnTrend.lastPeriod > 0) && (
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <p className="text-xs font-semibold text-red-400 mb-4">Churn Intelligence</p>
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Lost {RANGE_LABEL[range].toLowerCase()}</p>
              <p className="text-2xl font-bold text-red-500">£{(churnRevenue / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Cancellations</p>
              <p className="text-2xl font-bold text-gray-700">{churnTrend.thisPeriod}</p>
            </div>
            {range !== "all" && (
              <div>
                <p className="text-xs text-gray-400 mb-1">vs Previous period</p>
                <p className={`text-2xl font-bold ${churnTrend.thisPeriod > churnTrend.lastPeriod ? "text-red-500" : churnTrend.thisPeriod < churnTrend.lastPeriod ? "text-green-600" : "text-gray-400"}`}>
                  {churnTrend.thisPeriod > churnTrend.lastPeriod ? "▲" : churnTrend.thisPeriod < churnTrend.lastPeriod ? "▼" : "—"} {churnTrend.lastPeriod}→{churnTrend.thisPeriod}
                </p>
              </div>
            )}
          </div>
          {churnTrend.reasons.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
              {churnTrend.reasons.map((r) => (
                <span key={r.label} className="text-xs bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full">
                  {r.label} · {r.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500">Insights</p>
          </div>
          <ul>
            {insights.map((insight, i) => {
              const Icon = insight.icon;
              const iconClass =
                insight.type === "positive" ? "text-green-500 bg-green-50"
                : insight.type === "warning" ? "text-amber-500 bg-amber-50"
                : "text-gray-400 bg-gray-100";
              return (
                <li key={i} className="flex items-start gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
                  <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
                    <Icon size={14} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{insight.text}</p>
                    {insight.detail && <p className="text-xs text-gray-400 mt-0.5">{insight.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <p className="text-xs font-semibold text-gray-500 mb-5">Recent Activity</p>
        <ul className="space-y-0">
          {events.slice(0, 20).map((event, i) => {
            const cfg = typeConfig[event.type];
            return (
              <li key={i} className={`flex items-center gap-4 py-3 pl-3 border-b border-gray-50 last:border-0 border-l-2 ${cfg.border}`}>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate">{event.email}</span>
                  <span className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${cfg.pill}`}>{cfg.label}</span>
                </div>
                {event.amount > 0 && (
                  <span className={`text-sm font-medium tabular-nums ${event.type === "churn" ? "text-red-400" : "text-gray-700"}`}>
                    {event.type === "churn" ? "−" : "+"}£{(event.amount / 100).toFixed(2)}
                  </span>
                )}
                <span className="text-xs text-gray-300 w-16 text-right shrink-0">
                  {event.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

    </div>
  );
}
