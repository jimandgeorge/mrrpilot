"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function MetricTooltip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1 inline-block">
      <span className="cursor-default text-gray-300 hover:text-gray-500 text-xs border border-gray-200 rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
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
  type: "new" | "renewal" | "upgrade" | "churn";
};

export default function Home() {
  const [mrr, setMrr] = useState(0);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [weeklyChange, setWeeklyChange] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [insights, setInsights] = useState<{ icon: string; text: string; type: "positive" | "warning" | "neutral" }[]>([]);
  const [churnRevenue, setChurnRevenue] = useState(0);
  const [churnTrend, setChurnTrend] = useState<{ thisWeek: number; lastWeek: number; reasons: { label: string; count: number }[] }>({ thisWeek: 0, lastWeek: 0, reasons: [] });
  const [breakdown, setBreakdown] = useState({
    new: 0,
    upgrade: 0,
    renewal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [mrrHistory, setMrrHistory] = useState<{ month: string; mrr: number }[]>([]);

  useEffect(() => {
    fetch("/api/stripe")
      .then((res) => res.json())
      .then((data) => {
        const invoices = data.invoices || [];
        const stripeEvents = data.events || [];

        // 🧠 Map Stripe customer ID → email
        const customerEmailMap: Record<string, string> = {};

        invoices.forEach((inv: any) => {
          if (inv.customer && inv.customer_email) {
            customerEmailMap[inv.customer] = inv.customer_email;
          }
        });

        // 💸 MRR from latest invoice per customer, normalised to monthly
        let totalMRR = 0;
        const latestByCustomer: Record<string, any> = {};

        invoices.forEach((inv: any) => {
          const email = inv.customer_email || "Unknown";
          if (!latestByCustomer[email] || inv.created > latestByCustomer[email].created) {
            latestByCustomer[email] = inv;
          }
        });

        Object.values(latestByCustomer).forEach((inv: any) => {
          const line = inv.lines?.data?.[0];
          const interval = line?.price?.recurring?.interval;
          const intervalCount = line?.price?.recurring?.interval_count || 1;
          const amount = inv.amount_paid || 0;

          if (interval === "year") {
            totalMRR += Math.round(amount / (12 * intervalCount));
          } else if (interval === "week") {
            totalMRR += Math.round((amount * 52) / (12 * intervalCount));
          } else {
            totalMRR += Math.round(amount / intervalCount);
          }
        });

        // 🔥 sort invoices oldest → newest
        const sortedInvoices = [...invoices].sort(
          (a: any, b: any) => a.created - b.created
        );

        const seenCustomers = new Set<string>();

        const parsedEvents: EventItem[] = sortedInvoices.map((inv: any) => {
          const email = inv.customer_email || "Unknown";
          const amount = inv.amount_paid;
          const date = new Date(inv.created * 1000);

          let type: EventItem["type"] = "renewal";

          if (!seenCustomers.has(email)) {
            type = "new";
            seenCustomers.add(email);
          }

          if (inv.billing_reason === "subscription_update") {
            type = "upgrade";
          }

          return { amount, date, email, type };
        });

        // 💀 Deduped churn events WITH real email
        const churnedCustomers = new Set<string>();

        stripeEvents.forEach((evt: any) => {
          if (evt.type === "customer.subscription.deleted") {
            const customerId = evt.data.object.customer;

            if (!churnedCustomers.has(customerId)) {
              churnedCustomers.add(customerId);

              const email =
                customerEmailMap[customerId] || "Unknown";

              parsedEvents.push({
                amount:
                  evt.data.object.items.data[0].price.unit_amount,
                date: new Date(evt.created * 1000),
                email,
                type: "churn",
              });
            }
          }
        });

        // 🔥 sort newest first + prioritise "new"
        parsedEvents.sort((a, b) => {
          if (b.date.getTime() !== a.date.getTime()) {
            return b.date.getTime() - a.date.getTime();
          }
          if (a.type === "new") return -1;
          if (b.type === "new") return 1;
          return 0;
        });

        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        let weekly = 0;
        let churnAmount = 0;

        let newRevenue = 0;
        let upgradeRevenue = 0;
        let renewalRevenue = 0;

        const countedNew: Record<string, boolean> = {};
        const uniqueCustomers = new Set<string>();
        const churnedEmails = new Set<string>();

        parsedEvents.forEach((event) => {
          if (event.email) {
            uniqueCustomers.add(event.email);
          }

          if (event.type === "churn" && event.email) {
            churnedEmails.add(event.email);
          }

          if (event.date >= sevenDaysAgo) {
            if (event.type === "churn") {
              weekly -= event.amount;
              churnAmount += event.amount;
            } else {
              weekly += event.amount;
            }

            if (event.type === "new") {
              if (!countedNew[event.email || "unknown"]) {
                newRevenue += event.amount;
                countedNew[event.email || "unknown"] = true;
              }
            }

            if (event.type === "upgrade") {
              upgradeRevenue += event.amount;
            }

            if (event.type === "renewal") {
              renewalRevenue += event.amount;
            }
          }
        });

        // 👤 Customers active BEFORE this week
const customersBeforeWeek = new Set<string>();
const churnedThisWeek = new Set<string>();

parsedEvents.forEach((event) => {
  if (!event.email) return;

  if (event.date < sevenDaysAgo) {
    customersBeforeWeek.add(event.email);
  }

  if (event.date >= sevenDaysAgo && event.type === "churn") {
    churnedThisWeek.add(event.email);
  }
});

const churn =
  customersBeforeWeek.size > 0
    ? (churnedThisWeek.size / customersBeforeWeek.size) * 100
    : 0;

        const growth =
          totalMRR > 0
            ? Math.min((weekly / totalMRR) * 100, 100)
            : 0;

        const newCustomers = Object.keys(countedNew).length;

        // 📅 Daily revenue this week
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayRevenue: Record<string, number> = {};
        parsedEvents.forEach((event) => {
          if (event.date >= sevenDaysAgo && event.type !== "churn") {
            const key = dayNames[event.date.getDay()];
            dayRevenue[key] = (dayRevenue[key] || 0) + event.amount;
          }
        });

        // 💡 Build actionable insights
        type Insight = { icon: string; text: string; type: "positive" | "warning" | "neutral" };
        const insightList: Insight[] = [];

        // Best day
        const revenueEntries = Object.entries(dayRevenue).sort(([, a], [, b]) => b - a);
        if (revenueEntries.length > 0) {
          const [bestDay, bestAmount] = revenueEntries[0];
          insightList.push({ icon: "🔥", text: `Best day this week: ${bestDay} at £${(bestAmount / 100).toFixed(2)}`, type: "positive" });
        }

        // Revenue drop — days with 0 revenue between revenue days (weekdays only)
        if (revenueEntries.length > 0) {
          const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
          const dropDays = weekdays.filter((d) => !dayRevenue[d]);
          if (dropDays.length > 0 && dropDays.length < 5) {
            insightList.push({ icon: "⚠️", text: `No revenue on ${dropDays.slice(0, 2).join(", ")} — check for failed payments or gaps in outreach.`, type: "warning" });
          }
        }

        // New customers
        if (newCustomers > 0) {
          insightList.push({ icon: "🎉", text: `${newCustomers} new customer${newCustomers > 1 ? "s" : ""} this week — send a welcome message to improve retention.`, type: "positive" });
        } else {
          insightList.push({ icon: "💡", text: "No new customers this week — consider a promotional push or referral incentive.", type: "neutral" });
        }

        // Churn
        if (churnAmount > 0) {
          insightList.push({ icon: "⚠️", text: `Lost £${(churnAmount / 100).toFixed(2)} to churn — reach out to cancelled customers to learn why they left.`, type: "warning" });
        }

        // Upgrades
        if (upgradeRevenue === 0 && totalMRR > 0) {
          insightList.push({ icon: "📈", text: "No upgrades this week — try highlighting your higher-tier plan to existing customers.", type: "neutral" });
        }

        // Strong growth
        if (weekly > 0 && growth > 20) {
          insightList.push({ icon: "🚀", text: `Revenue up ${growth.toFixed(0)}% relative to MRR — strong week, keep the momentum going.`, type: "positive" });
        }

        // 📈 MRR history — normalised revenue grouped by month
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

        // 💀 Churn trend + reasons
        const churnEventsData: any[] = data.churnEvents || [];
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const churnsThisWeek = churnEventsData.filter((e) => new Date(e.cancelledAt * 1000) >= sevenDaysAgo);
        const churnsLastWeek = churnEventsData.filter((e) => {
          const d = new Date(e.cancelledAt * 1000);
          return d >= fourteenDaysAgo && d < sevenDaysAgo;
        });

        const reasonCounts: Record<string, number> = {};
        churnEventsData.forEach((e) => {
          const label = e.label || "Unknown";
          reasonCounts[label] = (reasonCounts[label] || 0) + 1;
        });
        const reasons = Object.entries(reasonCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([label, count]) => ({ label, count }));

        // Add churn trend to insights
        if (churnsThisWeek.length > 0 || churnsLastWeek.length > 0) {
          const trendDiff = churnsThisWeek.length - churnsLastWeek.length;
          if (trendDiff > 0) {
            insightList.push({ icon: "📈", text: `Churn is up this week (${churnsLastWeek.length} → ${churnsThisWeek.length} cancellations) — investigate what changed.`, type: "warning" });
          } else if (trendDiff < 0) {
            insightList.push({ icon: "✅", text: `Churn is down this week (${churnsLastWeek.length} → ${churnsThisWeek.length} cancellations) — retention is improving.`, type: "positive" });
          } else if (churnsThisWeek.length > 0) {
            insightList.push({ icon: "➡️", text: `Churn held steady at ${churnsThisWeek.length} cancellation${churnsThisWeek.length !== 1 ? "s" : ""} this week.`, type: "neutral" });
          }
        }

        setChurnTrend({ thisWeek: churnsThisWeek.length, lastWeek: churnsLastWeek.length, reasons });
        setMrrHistory(history);
        setMrr(totalMRR);
        setEvents(parsedEvents);
        setWeeklyChange(weekly);
        setChurnRate(churn);
        setGrowthRate(growth);
        setInsights(insightList);
        setChurnRevenue(churnAmount);
        setBreakdown({
          new: newRevenue,
          upgrade: upgradeRevenue,
          renewal: renewalRevenue,
        });
        setLoading(false);
      });
  }, []);


  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight">MRRPilot</h1>
          <p className="text-gray-500 mt-1">Understand your revenue at a glance</p>
        </div>
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

  return (
    <div className="max-w-5xl mx-auto p-8">

  {/* Header */}
  <div className="mb-10">
    <h1 className="text-4xl font-semibold tracking-tight">
      MRRPilot
    </h1>
    <p className="text-gray-500 mt-1">
      Understand your revenue at a glance
    </p>
  </div>

  {/* Metrics Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

    {/* MRR */}
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm text-gray-500 mb-1 flex items-center">
        Monthly Recurring Revenue
        <MetricTooltip text="Estimated monthly revenue based on your latest invoice per customer, normalised by billing interval." />
      </h2>
      <p className="text-4xl font-semibold">
        £{(mrr / 100).toFixed(2)}
      </p>
    </div>

    {/* Weekly */}
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm text-gray-500 mb-1 flex items-center">
        This Week
        <MetricTooltip text="Net revenue change in the last 7 days. Includes new payments minus any churned revenue." />
      </h2>
      <p className={`text-4xl font-semibold ${weeklyChange >= 0 ? "text-green-600" : "text-red-600"}`}>
        {weeklyChange >= 0 ? "+" : "-"}£
        {(Math.abs(weeklyChange) / 100).toFixed(2)}
      </p>
    </div>

    {/* Revenue Breakdown */}
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm text-gray-500 mb-3 flex items-center">
        Revenue Breakdown
        <MetricTooltip text="This week's revenue split by type: first payments from new customers, plan upgrades, and recurring renewals." />
      </h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>🎉 New</span>
          <span>£{(breakdown.new / 100).toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>📈 Upgrades</span>
          <span>£{(breakdown.upgrade / 100).toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>💸 Renewals</span>
          <span>£{(breakdown.renewal / 100).toFixed(2)}</span>
        </div>
      </div>
    </div>

    {/* Churn Rate */}
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm text-gray-500 mb-1 flex items-center">
        Churn Rate
        <MetricTooltip text="% of customers who were active before this week that cancelled this week. Above 5% is a warning sign." />
      </h2>
      <p className={`text-4xl font-semibold ${churnRate > 5 ? "text-red-600" : "text-green-600"}`}>
        {churnRate.toFixed(1)}%
      </p>
      {churnRate === 0 && churnRevenue > 0 && (
        <p className="text-xs text-gray-400 mt-1">Churned within first week</p>
      )}
    </div>

    {/* Growth */}
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm text-gray-500 mb-1 flex items-center">
        Growth Rate
        <MetricTooltip text="This week's net revenue as a % of your total MRR. Shows how fast your revenue is growing." />
      </h2>
      <p className={`text-4xl font-semibold ${growthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
        {growthRate.toFixed(1)}%
      </p>
    </div>

    {/* Churn Revenue */}
    <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
      <h2 className="text-sm text-red-600 mb-1 flex items-center">
        Revenue Lost (Churn)
        <MetricTooltip text="Total revenue from customers who cancelled this week. Based on their last subscription price." />
      </h2>
      <p className="text-4xl font-semibold text-red-700">
        £{(churnRevenue / 100).toFixed(2)}
      </p>
    </div>

  </div>

  {/* MRR Chart */}
  {mrrHistory.length > 1 && (
    <div className="mb-10 bg-white border border-gray-200 rounded-2xl p-6">
      <h2 className="text-sm font-medium text-gray-500 mb-4">MRR Over Time</h2>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={mrrHistory}>
          <defs>
            <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000" stopOpacity={0.08} />
              <stop offset="95%" stopColor="#000" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v}`} />
          <Tooltip formatter={(v) => [`£${v}`, "MRR"]} />
          <Area type="monotone" dataKey="mrr" stroke="#000" strokeWidth={2} fill="url(#mrrGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )}

  {/* Churn Intelligence */}
  {(churnRevenue > 0 || churnTrend.thisWeek > 0 || churnTrend.lastWeek > 0) && (
    <div className="mb-10 bg-red-50 border border-red-200 rounded-2xl p-6">
      <h2 className="text-sm font-medium text-red-700 mb-4">Churn Intelligence</h2>

      <div className="grid grid-cols-3 gap-6 mb-5">
        <div>
          <p className="text-xs text-red-500 mb-1">Lost this week</p>
          <p className="text-2xl font-semibold text-red-700">
            £{(churnRevenue / 100).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-red-500 mb-1">Cancellations</p>
          <p className="text-2xl font-semibold text-red-700">{churnTrend.thisWeek}</p>
        </div>
        <div>
          <p className="text-xs text-red-500 mb-1">vs Last Week</p>
          <p className={`text-2xl font-semibold ${
            churnTrend.thisWeek > churnTrend.lastWeek
              ? "text-red-700"
              : churnTrend.thisWeek < churnTrend.lastWeek
              ? "text-green-600"
              : "text-gray-500"
          }`}>
            {churnTrend.thisWeek > churnTrend.lastWeek ? "▲" : churnTrend.thisWeek < churnTrend.lastWeek ? "▼" : "—"}
            {" "}{churnTrend.lastWeek} → {churnTrend.thisWeek}
          </p>
        </div>
      </div>

      {churnTrend.reasons.length > 0 && (
        <div>
          <p className="text-xs text-red-500 mb-2">Cancellation reasons</p>
          <div className="flex flex-wrap gap-2">
            {churnTrend.reasons.map((r) => (
              <span key={r.label} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full">
                {r.label} · {r.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )}

  {/* Insights */}
  {insights.length > 0 && (
    <div className="mb-10 bg-white border border-gray-200 rounded-2xl p-6">
      <h2 className="text-sm font-medium text-gray-500 mb-4">Insights</h2>
      <ul className="space-y-3">
        {insights.map((insight, i) => (
          <li
            key={i}
            className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
              insight.type === "positive"
                ? "bg-green-50 text-green-800"
                : insight.type === "warning"
                ? "bg-yellow-50 text-yellow-800"
                : "bg-gray-50 text-gray-700"
            }`}
          >
            <span className="text-base">{insight.icon}</span>
            <span>{insight.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )}

  {/* Activity Feed */}
  <div>
    <h2 className="text-sm font-medium text-gray-500 mb-4">
      Recent Activity
    </h2>

    <ul className="space-y-3">
      {events.map((event, i) => (
        <li
          key={i}
          className={`p-4 rounded-xl border flex justify-between items-center ${
            event.type === "churn"
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-white text-gray-800 border-gray-200"
          }`}
        >
          <span>
            {event.type === "new" && `🎉 ${event.email} started`}
            {event.type === "upgrade" && `📈 ${event.email} upgraded`}
            {event.type === "renewal" && `💸 ${event.email} renewed`}
            {event.type === "churn" && `💀 ${event.email} cancelled`}
          </span>

          <span className="text-sm text-gray-400">
            {event.date.toLocaleDateString()}
          </span>
        </li>
      ))}
    </ul>
  </div>

</div>
  );
}
