import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { mrr, weeklyChange, churnRate, events } = await req.json();

  let summary = "";

  const newCustomers = events.filter((e: any) => e.type === "new").length;
  const churned = events.filter((e: any) => e.type === "churn").length;

  // 🧠 Core summary
  summary = `This week your revenue ${
    weeklyChange >= 0 ? "increased" : "decreased"
  } by £${(Math.abs(weeklyChange) / 100).toFixed(2)}. `;

  // 👤 Customers
  if (newCustomers > 0) {
    summary += `You gained ${newCustomers} new customer${
      newCustomers > 1 ? "s" : ""
    }. `;
  }

  if (churned > 0) {
    summary += `You lost ${churned} customer${
      churned > 1 ? "s" : ""
    }. `;
  }

  // 💀 Churn insight
  if (churnRate > 15) {
    summary += "Churn is very high — this is your biggest risk right now.";
  } else if (churnRate > 5) {
    summary += "Churn is noticeable — worth keeping an eye on.";
  }

  // 📈 Growth insight
  if (weeklyChange > 0 && churnRate < 5) {
    summary += " Overall, your business is growing in a healthy way.";
  }

  if (weeklyChange < 0) {
    summary += " Revenue is declining — you may want to investigate cancellations or pricing.";
  }

  // 🚀 Empty state
  if (events.length === 0) {
    summary = "No activity yet — time to get your first customer 🚀";
  }

  return NextResponse.json({ summary });
}