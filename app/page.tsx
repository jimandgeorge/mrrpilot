"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type EventItem = {
  amount: number;
  date: Date;
  email?: string;
  type: "new" | "payment" | "upgrade" | "churn";
};

export default function Home() {
  const [mrr, setMrr] = useState(0);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [weeklyChange, setWeeklyChange] = useState(0);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [churnRate, setChurnRate] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    fetch("/api/stripe")
      .then((res) => res.json())
      .then((data) => {
        const subscriptions = data.subscriptions || [];
        const invoices = data.invoices || [];
        const stripeEvents = data.events || [];

        let totalMRR = 0;

        subscriptions.forEach((sub: any) => {
          if (sub.status === "active") {
            totalMRR += sub.items.data[0].price.unit_amount;
          }
        });

        const parsedEvents: EventItem[] = invoices.map((inv: any) => {
          const email = inv.customer_email || "Unknown";
          const amount = inv.amount_paid;
          const date = new Date(inv.created * 1000);

          let type: "new" | "payment" | "upgrade" = "payment";

          if (inv.billing_reason === "subscription_create") {
            type = "new";
          }

          if (inv.billing_reason === "subscription_update") {
            type = "upgrade";
          }

          return { amount, date, email, type };
        });

        stripeEvents.forEach((evt: any) => {
          if (evt.type === "customer.subscription.deleted") {
            const sub = evt.data.object;

            parsedEvents.push({
              amount: sub.items.data[0].price.unit_amount,
              date: new Date(evt.created * 1000),
              email: "Customer",
              type: "churn",
            });
          }
        });

        parsedEvents.sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        );

        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        let weekly = 0;
        let churnAmount = 0;

        parsedEvents.forEach((event) => {
          if (event.date >= sevenDaysAgo) {
            if (event.type === "churn") {
              weekly -= event.amount;
              churnAmount += event.amount;
            } else {
              weekly += event.amount;
            }
          }
        });

        let churn = 0;
        if (totalMRR > 0) {
          churn = (churnAmount / (totalMRR + churnAmount)) * 100;
        }

        let growth = 0;
        if (totalMRR > 0) {
          growth = (weekly / totalMRR) * 100;
        }

        const alertList: string[] = [];

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(now.getDate() - 3);

        const recentActivity = parsedEvents.some(
          (event) => event.date >= threeDaysAgo
        );

        if (!recentActivity) {
          alertList.push("⚠️ No revenue in the last 3 days");
        }

        if (weekly < 0) {
          alertList.push("📉 Revenue decreased this week");
        }

        if (weekly > 3000) {
          alertList.push("🚀 Strong revenue growth this week");
        }

        if (churn > 10) {
          alertList.push("💀 High churn rate");
        }

        if (totalMRR > 0 && totalMRR < 5000) {
          alertList.push("🎉 You have active revenue!");
        }

        setMrr(totalMRR);
        setEvents(parsedEvents);
        setWeeklyChange(weekly);
        setChurnRate(churn);
        setGrowthRate(growth);
        setAlerts(alertList);
// 🧠 Build summary (no AI)

// define counts FIRST
const newCustomers = parsedEvents.filter((e: any) => e.type === "new").length;
const churned = parsedEvents.filter((e: any) => e.type === "churn").length;

let summaryText = "";

summaryText = `This week your revenue ${
  weekly >= 0 ? "increased" : "decreased"
} by £${(Math.abs(weekly) / 100).toFixed(2)}. `;

if (newCustomers > 0) {
  summaryText += `You gained ${newCustomers} new customer${
    newCustomers > 1 ? "s" : ""
  }. `;
}

if (churned > 0) {
  summaryText += `You lost ${churned} customer${
    churned > 1 ? "s" : ""
  }. `;
}

if (churn > 10) {
  summaryText += "Churn is high and needs attention.";
}

setSummary(summaryText);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto">

  {/* Main Content */}
  <div className="flex-1 p-8 max-w-5xl mx-auto">

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
            <p className="text-4xl font-semibold tracking-tight">
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
              {Math.abs(weeklyChange / 100).toFixed(2)}
            </p>
          </div>

          {/* Churn */}
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

        </div>

        {/* 🧠 AI Summary */}
<div className="mb-10 bg-white border border-gray-200 rounded-2xl p-6">
  <h2 className="text-sm font-medium text-gray-500 mb-2">
    Insights
  </h2>

  <p className="text-lg text-gray-800 leading-relaxed">
    {summary || "Thinking..."}
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
                className={`p-4 rounded-xl border border-gray-200 flex justify-between items-center ${
                  event.type === "churn"
                    ? "bg-red-50 text-red-600"
                    : "bg-white text-gray-800"
                }`}
              >
                <span>
                  {event.type === "new" && (
                    <>🎉 {event.email} started a subscription</>
                  )}
                  {event.type === "upgrade" && (
                    <>📈 {event.email} upgraded</>
                  )}
                  {event.type === "payment" && (
                    <>💸 {event.email} made a payment</>
                  )}
                  {event.type === "churn" && (
                    <>💀 {event.email} cancelled</>
                  )}
                </span>

                <span className="text-sm text-gray-400">
                  {event.date.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}