"use client";
import { useEffect, useState } from "react";

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
  const [alerts, setAlerts] = useState<string[]>([]);
  const [churnRate, setChurnRate] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [summary, setSummary] = useState("");
  const [churnRevenue, setChurnRevenue] = useState(0);
  const [breakdown, setBreakdown] = useState({
    new: 0,
    upgrade: 0,
    renewal: 0,
  });

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

        // 💸 MRR (latest invoice per customer)
        let totalMRR = 0;
        const latestByCustomer: Record<string, any> = {};

        invoices.forEach((inv: any) => {
          const email = inv.customer_email || "Unknown";

          if (
            !latestByCustomer[email] ||
            inv.created > latestByCustomer[email].created
          ) {
            latestByCustomer[email] = inv;
          }
        });

        Object.values(latestByCustomer).forEach((inv: any) => {
          totalMRR += inv.amount_paid;
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

        const alertList: string[] = [];

        if (weekly < 0) alertList.push("📉 Revenue decreased this week");
        if (weekly > 3000) alertList.push("🚀 Strong revenue growth this week");
        if (churn > 10) alertList.push("💀 High churn rate");
        if (totalMRR > 0) alertList.push("🎉 You have active revenue!");

        // 🧠 summary
        const newCustomers = Object.keys(countedNew).length;

        let summaryText = `This week your revenue ${
          weekly >= 0 ? "increased" : "decreased"
        } by £${(Math.abs(weekly) / 100).toFixed(2)}. `;

        if (newRevenue > 0) {
          summaryText += `£${(newRevenue / 100).toFixed(2)} came from new customers. `;
        }

        if (renewalRevenue > 0) {
          summaryText += `£${(renewalRevenue / 100).toFixed(2)} came from renewals. `;
        }

        if (upgradeRevenue > 0) {
          summaryText += `£${(upgradeRevenue / 100).toFixed(2)} came from upgrades. `;
        }

        if (churnAmount > 0) {
          summaryText += `You lost £${(churnAmount / 100).toFixed(2)} from churn. `;
        }

        if (newCustomers > 0) {
          summaryText += `You gained ${newCustomers} new customer${
            newCustomers > 1 ? "s" : ""
          }.`;
        }

        setMrr(totalMRR);
        setEvents(parsedEvents);
        setWeeklyChange(weekly);
        setChurnRate(churn);
        setGrowthRate(growth);
        setAlerts(alertList);
        setChurnRevenue(churnAmount);
        setBreakdown({
          new: newRevenue,
          upgrade: upgradeRevenue,
          renewal: renewalRevenue,
        });
        setSummary(summaryText);
      });
  }, []);


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
      <h2 className="text-sm text-gray-500 mb-1">
        Monthly Recurring Revenue
      </h2>
      <p className="text-4xl font-semibold">
        £{(mrr / 100).toFixed(2)}
      </p>
    </div>

    {/* Weekly */}
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm text-gray-500 mb-1">
        This Week
      </h2>
      <p className={`text-4xl font-semibold ${weeklyChange >= 0 ? "text-green-600" : "text-red-600"}`}>
        {weeklyChange >= 0 ? "+" : "-"}£
        {(Math.abs(weeklyChange) / 100).toFixed(2)}
      </p>
    </div>

    {/* Revenue Breakdown */}
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm text-gray-500 mb-3">
        Revenue Breakdown
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
      <h2 className="text-sm text-gray-500 mb-1">
        Churn Rate
      </h2>
      <p className={`text-4xl font-semibold ${churnRate > 5 ? "text-red-600" : "text-green-600"}`}>
        {churnRate.toFixed(1)}%
      </p>
    </div>

    {/* Growth */}
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm text-gray-500 mb-1">
        Growth Rate
      </h2>
      <p className={`text-4xl font-semibold ${growthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
        {growthRate.toFixed(1)}%
      </p>
    </div>

    {/* Churn Revenue */}
    <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
      <h2 className="text-sm text-red-600 mb-1">
        Revenue Lost (Churn)
      </h2>
      <p className="text-4xl font-semibold text-red-700">
        £{(churnRevenue / 100).toFixed(2)}
      </p>
    </div>

  </div>

  {/* 🧠 Insights (FIXED TITLE) */}
  <div className="mb-10 bg-white border border-gray-200 rounded-2xl p-6">
    <h2 className="text-sm font-medium text-gray-500 mb-2">
      Insights
    </h2>
    <p className="text-lg text-gray-800">
      {summary}
    </p>
  </div>

  {/* Alerts */}
  {alerts.length > 0 && (
    <div className="mb-10 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
      <h2 className="text-sm font-medium text-yellow-900 mb-2">
        Alerts
      </h2>
      <ul className="space-y-1 text-yellow-800">
        {alerts.map((alert, i) => (
          <li key={i}>{alert}</li>
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

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-5 border rounded-xl bg-white">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}