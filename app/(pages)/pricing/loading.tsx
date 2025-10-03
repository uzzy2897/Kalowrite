"use client";

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto py-16 px-6 text-center animate-pulse">
      {/* Header */}
      <div className="space-y-3 mb-10">
        <div className="h-10 w-72 bg-card rounded-md mx-auto" />
        <div className="h-4 w-96 bg-card rounded-md mx-auto" />
        <div className="h-3 w-60 bg-card rounded-md mx-auto" />
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-12">
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-card rounded-full" />
          <div className="h-10 w-28 bg-card rounded-full" />
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="border rounded-2xl p-8 shadow-md bg-card flex flex-col space-y-6"
          >
            {/* Plan name + tag */}
            <div className="flex justify-between items-center">
              <div className="h-6 w-20 bg-card rounded-md" />
              <div className="h-5 w-14 bg-card rounded-full" />
            </div>

            {/* Price */}
            <div className="h-8 w-32 bg-card rounded-md text-start" />

            {/* Features */}
            <ul className="space-y-3">
              {Array.from({ length: 5 }).map((__, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-card rounded-full" />
                  <div className="h-4 w-40 bg-card rounded-md" />
                </li>
              ))}
            </ul>

            {/* Button */}
            <div className="h-10 w-full bg-card rounded-md mt-auto" />
          </div>
        ))}
      </div>
    </main>
  );
}
