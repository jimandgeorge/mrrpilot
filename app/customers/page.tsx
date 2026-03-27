"use client";

import { useEffect, useState } from "react";

type Customer = {
  email: string;
  total: number;
  payments: number;
  lastPayment: Date;
  churned: boolean;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetch("/api/stripe")
      .then((res) => res.json())
      .then((data) => {
        const sorted = (data.customers || []).sort(
          (a: any, b: any) => b.total - a.total
        );

        setCustomers(sorted);
      });
  }, []);

  // 🧠 Split customers
  const activeCustomers = customers.filter((c) => !c.churned);
  const churnedCustomers = customers.filter((c) => c.churned);

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Customers</h1>
        <p className="text-gray-500 mt-1">
          See who is driving your revenue
        </p>
      </div>

      {/* Active Customers */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-3">
          Active Customers
        </h2>

        <div className="space-y-3">
          {activeCustomers.map((c, i) => {
            const now = new Date();
            const lastPayment = new Date(c.lastPayment);

            const daysSince =
              (now.getTime() - lastPayment.getTime()) /
              (1000 * 60 * 60 * 24);

            // ⚠️ Only at risk if NOT churned
            const isAtRisk = !c.churned && daysSince > 30;

            return (
              <div
                key={i}
                className={`p-5 border rounded-2xl flex justify-between items-center ${
                  isAtRisk
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium">{c.email}</p>

                  {i === 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                      🏆 Top
                    </span>
                  )}

                  {isAtRisk && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                      ⚠️ At risk
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-semibold text-lg">
                    £{(c.total / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-400">
                    Last:{" "}
                    {new Date(c.lastPayment).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Churned Customers */}
      {churnedCustomers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-red-600">
            Churned Customers
          </h2>

          <div className="space-y-3">
            {churnedCustomers.map((c, i) => (
              <div
                key={i}
                className="p-5 bg-red-50 border border-red-200 rounded-2xl flex justify-between items-center"
              >
                <p className="font-medium text-red-700">
                  {c.email}
                </p>

                <p className="text-red-700">
                  £{(c.total / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}