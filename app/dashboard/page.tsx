"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, Plug, AlertTriangle, TrendingUp, TrendingDown, UserPlus, UserMinus, AlertCircle, Lightbulb, Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type EventItem = {
  amount: number;
  date: Date;
  email?: string;
  customerId?: string;
  type: "new" | "renewal" | "upgrade" | "churn";
};

type Range = "7d" | "30d" | "90d" | "all";

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
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [range, setRange] = useState<Range>("7d");
  const [billing, setBilling] = useState<{ daysLeft: number; isActive: boolean; trialExpired: boolean; status: string } | null>(null);
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
  const [arpu, setArpu] = useState(0);
  const [nrr, setNrr] = useState<number | null>(null);
  const [quickRatio, setQuickRatio] = useState<number | null>(null);
  const [churnRisk, setChurnRisk] = useState<{ id: string; email: string; daysPastDue: number; mrr: number; planName?: string }[]>([]);
  const [planRevenue, setPlanRevenue] = useState<{ name: string; mrr: number; customers: number; pct: number }[]>([]);
  const [pastDue, setPastDue] = useState<{ id: string; email: string; amount: number; daysOverdue: number; hostedUrl: string | null }[]>([]);
  const [userEmail, setUserEmail] = useState("");

  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [emailDrafts, setEmailDrafts] = useState<Record<string, { content: string; loading: boolean; open: boolean }>>({});
  const [mrrMoM, setMrrMoM] = useState<number | null>(null);
  const [prose, setProse] = useState<{ momentum: string | null; mix: string | null; churn: string | null }>({ momentum: null, mix: null, churn: null });
  const [proseLoading, setProseLoading] = useState(false);
  const [priority, setPriority] = useState("");
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  // Load goal from API (falls back to localStorage for existing users)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch("/api/user/goal", { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.mrr_goal > 0) {
            setMrrGoal(d.mrr_goal);
          } else {
            const saved = localStorage.getItem("revint_goal");
            if (saved) setMrrGoal(Number(saved));
          }
        })
        .catch(() => {
          const saved = localStorage.getItem("revint_goal");
          if (saved) setMrrGoal(Number(saved));
        });
    });
  }, []);

  async function loadData(manual = false) {
    setFetchError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setUserEmail(session.user.email);

      // Fetch billing status — blocking so we can gate expired trials
      const billingRes = await fetch("/api/billing/status", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const billingData = await billingRes.json();
      setBilling(billingData);
      if (billingData.trialExpired) { setLoading(false); setRefreshing(false); return; }

      const url = manual ? "/api/stripe?manual=1" : "/api/stripe";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json();
      if (data.rateLimited) {
        setCooldownUntil(Date.now() + data.secondsLeft * 1000);
        setRefreshing(false);
        setLoading(false);
        return;
      }
      if (data.notConnected) { setNotConnected(true); setLoading(false); return; }
      setRawData(data);
      setPastDue(data.pastDueInvoices || []);
      setChurnRisk(data.atRiskSubscriptions || []);
      setCooldownUntil(Date.now() + 60000);
    } catch {
      setFetchError(true);
      setLoading(false);
    }
    setRefreshing(false);
  }

  useEffect(() => { loadData(); }, []);

  // Countdown ticker
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    setCooldownLeft(Math.ceil((cooldownUntil - Date.now()) / 1000));
    const id = setInterval(() => {
      const left = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (left <= 0) { setCooldownLeft(0); clearInterval(id); }
      else setCooldownLeft(left);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

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

  async function fetchProse(metrics: object) {
    setProseLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/analytics-prose", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify(metrics),
      });
      if (res.ok) {
        const data = await res.json();
        setProse({ momentum: data.momentum ?? null, mix: data.mix ?? null, churn: data.churn ?? null });
      }
    } catch {
      // non-critical
    }
    setProseLoading(false);
  }

  async function fetchPriority(metrics: object) {
    setPriority("");
    setPriorityLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify(metrics),
      });
      if (!res.ok || !res.body) return;
      setPriorityLoading(false);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setPriority((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch { }
    setPriorityLoading(false);
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
        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
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

  async function saveGoal() {
    const val = parseFloat(goalInput);
    const pence = !isNaN(val) && val > 0 ? Math.round(val * 100) : 0;
    setMrrGoal(pence);
    setEditingGoal(false);
    setGoalInput("");
    const { data: { session } } = await supabase.auth.getSession();
    fetch("/api/user/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ mrr_goal: pence }),
    }).catch(() => {});
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

    // Period revenue breakdown — sourced from waterfall last complete month so it matches MRR Movement
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

    // Override breakdown with last complete calendar month from waterfall (matches MRR Movement chart)
    const wfMonthsTemp = Object.keys(monthCustomerMrr).sort();
    // Use second-to-last month (last complete month — current month is in progress)
    const lastCompleteMonthKey = wfMonthsTemp.length >= 2 ? wfMonthsTemp[wfMonthsTemp.length - 2] : wfMonthsTemp[wfMonthsTemp.length - 1];
    if (lastCompleteMonthKey) {
      const prevMonthKey = wfMonthsTemp[wfMonthsTemp.indexOf(lastCompleteMonthKey) - 1];
      const prevMonthData = prevMonthKey ? monthCustomerMrr[prevMonthKey] : {};
      const curMonthData = monthCustomerMrr[lastCompleteMonthKey];
      let wfNew = 0, wfExpansion = 0, wfRenewal = 0;
      Object.entries(curMonthData).forEach(([cid, mrr]) => {
        if (!prevMonthData[cid]) wfNew += mrr;
        else if (mrr > prevMonthData[cid]) wfExpansion += mrr - prevMonthData[cid];
        else wfRenewal += mrr; // same or lower = renewal (contraction counted separately in waterfall)
      });
      newRevenue = wfNew;
      upgradeRevenue = wfExpansion;
      renewalRevenue = wfRenewal;
    }

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

    // MRR history (monthly) — used for MoM and forecast
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
    const history = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        month: new Date(key + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        mrr: Math.round(val / 100),
      }));

    // MoM growth — compare last two complete months
    let calcMrrMoM: number | null = null;
    if (history.length >= 2) {
      const prev = history[history.length - 2].mrr ?? 0;
      const curr = history[history.length - 1].mrr ?? 0;
      if (prev > 0) calcMrrMoM = Math.round(((curr - prev) / prev) * 100);
    }

    // 📈 Forecast — linear regression on last 6 months; fall back to current MRR if not enough history
    let forecastedMrr = totalMRR; // flat projection as default
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

      setProjectedMrr(forecastedMrr);
    } else {
      setProjectedMrr(forecastedMrr);
    }

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

    setMrr(totalMRR);
    setMrrMoM(calcMrrMoM);
    setArpu(calcArpu);
    setNrr(calcNrr);
    setQuickRatio(calcQuickRatio);
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
    setLoading(false);

    const sharedMetrics = {
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
    };

    // Suggested questions based on data state
    const questions: string[] = [];
    if (churnRisk.length > 0) questions.push(`Why is ${churnRisk[0].email} at risk?`);
    if (churnsThisPeriod.length > churnsLastPeriod.length) questions.push("What's driving the increase in churn?");
    if (calcMrrMoM !== null && calcMrrMoM < 0) questions.push("Why did revenue drop this month?");
    if (calcMrrMoM !== null && calcMrrMoM > 15) questions.push("What's driving my growth right now?");
    if (calcNrr !== null && calcNrr < 90) questions.push("How do I improve my retention?");
    const defaults = ["Who should I reach out to today?", "What's my biggest risk right now?", "Which customers are most likely to upgrade?", "What should I focus on this week?"];
    for (const d of defaults) { if (questions.length >= 3) break; questions.push(d); }
    setSuggestedQuestions(questions.slice(0, 3));

    // Fire non-blocking AI fetches
    const recentChurns = parsedEvents.filter(e => e.type === "churn").slice(0, 3).map(e => ({ email: e.email, mrr: e.amount }));
    // Use second-to-last waterfall month (last complete month) for churn split
    const lastCompleteWf = calcWaterfall.length >= 2 ? calcWaterfall[calcWaterfall.length - 2] : calcWaterfall[calcWaterfall.length - 1] ?? null;
    fetchCommentary(sharedMetrics);
    fetchPriority({ ...sharedMetrics, mrrMoM: calcMrrMoM, nrr: calcNrr, recentChurns });
    fetchProse({
      ...sharedMetrics,
      mrrMoM: calcMrrMoM,
      nrr: calcNrr,
      quickRatio: calcQuickRatio,
      arpu: calcArpu,
      mrrWaterfall: calcWaterfall,
      planRevenue: calcPlanRevenue,
      contractionRevenue: lastCompleteWf ? Math.abs(lastCompleteWf.contraction) * 100 : 0,
      waterfallChurnRevenue: lastCompleteWf ? Math.abs(lastCompleteWf.churn) * 100 : 0,
    });
  }

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

  if (billing?.trialExpired) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
          <Lock size={24} className="text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Your trial has ended</h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-xs">
          Subscribe to keep your revenue insights, churn alerts, and AI briefings.
        </p>
        <a href="/upgrade" className="inline-block bg-indigo-600 text-white text-sm font-semibold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-colors">
          Subscribe — £29/mo →
        </a>
        <p className="text-xs text-gray-400 mt-4">Cancel anytime · No commitment.</p>
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
          <button onClick={() => { if (cooldownLeft > 0) return; setRefreshing(true); loadData(true); }} disabled={refreshing || cooldownLeft > 0}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 min-w-[90px]">
            <RefreshCw size={12} className={`inline mr-1 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Refreshing…" : cooldownLeft > 0 ? `${cooldownLeft}s` : "Refresh"}
          </button>
        </div>
      </div>

      {/* Trial banner */}
      {billing && billing.status === "trialing" && !billing.trialExpired && (
        <div className={`flex items-center justify-between border rounded-xl px-5 py-3 ${billing.daysLeft <= 3 ? "bg-amber-50 border-amber-100" : "bg-indigo-50 border-indigo-100"}`}>
          <p className={`text-sm ${billing.daysLeft <= 3 ? "text-amber-800" : "text-indigo-800"}`}>
            {billing.daysLeft === 0
              ? "Your trial ends today."
              : `${billing.daysLeft} day${billing.daysLeft !== 1 ? "s" : ""} left in your free trial.`}
          </p>
          <a href="/upgrade" className={`shrink-0 text-xs font-semibold ml-4 transition-colors ${billing.daysLeft <= 3 ? "text-amber-700 hover:text-amber-900" : "text-indigo-600 hover:text-indigo-800"}`}>
            Subscribe now →
          </a>
        </div>
      )}
      {billing?.trialExpired && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-5 py-3">
          <p className="text-sm text-red-800 font-medium">Your trial has ended — subscribe to keep access.</p>
          <a href="/upgrade" className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 ml-4 transition-colors">
            Subscribe now →
          </a>
        </div>
      )}

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
        {(priorityLoading || priority) && (
          <div className="mb-5 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl px-4 py-3">
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">Today&apos;s priority</p>
            {priorityLoading ? (
              <div className="h-4 bg-indigo-100 rounded w-3/4 animate-pulse" />
            ) : (
              <p className="text-sm font-medium text-indigo-900">{priority}</p>
            )}
          </div>
        )}

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
          <div ref={chatScrollRef} className="mt-6 space-y-4 border-t border-gray-100 pt-5 max-h-72 overflow-y-auto">
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
        {chatMessages.length === 0 && !chatStreaming && suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {suggestedQuestions.map((q) => (
              <button key={q} onClick={() => setChatInput(q)}
                className="text-xs text-gray-400 hover:text-indigo-600 border border-gray-100 hover:border-indigo-200 px-3 py-1.5 rounded-full transition-colors">
                {q}
              </button>
            ))}
          </div>
        )}
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
                <span className="font-semibold">{c.email}</span> subscription is past due · {c.daysPastDue === 0 ? "overdue today" : `${c.daysPastDue} day${c.daysPastDue !== 1 ? "s" : ""} overdue`} — reach out before they cancel.
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
          {mrrGoal > 0 && <button onClick={async () => { setMrrGoal(0); setEditingGoal(false); const { data: { session } } = await supabase.auth.getSession(); fetch("/api/user/goal", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` }, body: JSON.stringify({ mrr_goal: 0 }) }).catch(() => {}); }} className="text-xs text-red-400 hover:text-red-600 px-2">Remove</button>}
          <button onClick={() => { setEditingGoal(false); setGoalInput(""); }} className="text-xs text-gray-400 px-2">✕</button>
        </div>
      )}
      {!mrrGoal && !editingGoal && (
        <button onClick={() => setEditingGoal(true)} className="text-xs text-gray-300 hover:text-indigo-500 transition-colors pl-1">+ Set MRR goal</button>
      )}

      {/* Prose sections — replace all charts */}
      {[
        { key: "momentum" as const, label: "Revenue momentum" },
        { key: "mix"      as const, label: "Revenue mix"      },
        { key: "churn"    as const, label: "Churn"            },
      ].map(({ key, label }) => (
        <div key={key} className="bg-white rounded-2xl border border-gray-200 p-7">
          <p className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase mb-4">{label}</p>
          {proseLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 bg-gray-100 rounded-lg w-full" />
              <div className="h-5 bg-gray-100 rounded-lg w-10/12" />
              <div className="h-5 bg-gray-100 rounded-lg w-8/12" />
            </div>
          ) : prose[key] ? (
            <p className="text-[17px] leading-relaxed text-gray-800">{prose[key]}</p>
          ) : (
            <p className="text-sm text-gray-300">Analysis unavailable.</p>
          )}
        </div>
      ))}

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
