"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const USAGE_PACKAGES = [
  {
    id: "small",
    amount: 30,
    price: 8.99,
    label: "Mały pakiet",
  },
  {
    id: "medium",
    amount: 300,
    price: 79.99,
    label: "Średni pakiet",
  },
  {
    id: "large",
    amount: 3000,
    price: 699.99,
    label: "Duży pakiet",
  },
];

export default function BuyUsage() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handlePurchase = async (packageType: string) => {
    setLoading(packageType);
    try {
      const res = await fetch("/api/stripe/purchase-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Wystąpił błąd podczas tworzenia sesji płatności");
        setLoading(null);
      }
    } catch (error) {
      console.error("Error purchasing usage:", error);
      alert("Wystąpił błąd podczas zakupu użyć");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Dokup użycia</h3>
      <p className="text-sm text-neutral-600">
        Zakup dodatkowe użycia, aby móc generować więcej misji. Zakupione użycia nie wygasają.
      </p>
      <div className="grid grid-cols-1 gap-4">
        {USAGE_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold">{pkg.label}</h4>
                <p className="text-sm text-neutral-600">
                  {pkg.amount} użyć
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{pkg.price.toFixed(2)} zł</p>
                <p className="text-xs text-neutral-500">
                  {(pkg.price / pkg.amount).toFixed(3)} zł/użycie
                </p>
              </div>
            </div>
            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={loading === pkg.id}
              className="w-full rounded-lg bg-orange-500 text-white py-2 text-sm font-medium hover:bg-orange-600 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === pkg.id ? "Przetwarzanie..." : "Kup teraz"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

