"use client";

export default function BillingToggle({
  billing,
  setBilling,
}: {
  billing: "monthly" | "yearly";
  setBilling: (b: "monthly" | "yearly") => void;
}) {
  return (
    <div className="flex justify-center mb-12">
      <div className="inline-flex items-center border rounded-full bg-accent overflow-hidden">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-6 py-2 text-sm font-medium transition-colors ${
            billing === "monthly" ? "bg-emerald-600 text-white rounded-full" : "text-muted-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`px-6 py-2 text-sm font-medium transition-colors ${
            billing === "yearly" ? "bg-emerald-600 text-white rounded-full" : "text-muted-foreground"
          }`}
        >
          Yearly
        </button>
      </div>
    </div>
  );
}
