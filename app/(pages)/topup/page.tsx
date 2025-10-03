"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TopupsPage() {
  const [words, setWords] = useState(5000); // min 5000 words

  // Calculate price: $2 per 1000 words
  const price = (words / 1000) * 2;

  const handleBuy = async () => {
    try {
      const res = await fetch("/api/create-topup-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch {
      alert("Failed to create checkout session");
    }
  };

  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Buy Additional Words</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Add more words to your account. 
            <br />
            <strong>These words never expire</strong> and can be used anytime. 
            <br />
            <span className="font-medium text-emerald-600">$2 per 1,000 words</span>.
          </p>

          {/* Slider + Value */}
          <div className="space-y-4">
            <label className="font-medium">Select amount:</label>

            {/* Quick select buttons */}
            <div className="flex gap-2">
              {[5000, 10000, 20000, 30000].map((preset) => (
                <Button
                  key={preset}
                  variant={words === preset ? "default" : "outline"}
                  onClick={() => setWords(preset)}
                  className="flex-1"
                >
                  {preset.toLocaleString()}
                </Button>
              ))}
            </div>

            {/* Native Range Slider */}
            <input
              type="range"
              min={5000}
              max={30000}
              step={1000}
              value={words}
              onChange={(e) => setWords(Number(e.target.value))}
              className="w-full accent-emerald-500 mt-4"
            />

            {/* Displayed Amount */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{words.toLocaleString()} words</span>
              <span className="text-lg font-bold text-emerald-600">${price.toFixed(2)}</span>
            </div>
          </div>

          {/* Buy button */}
          <Button className="w-full bg-emerald-500   py-6" onClick={handleBuy}>
            Buy Now → {words.toLocaleString()} words for ${price.toFixed(2)}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Payments are secure via Stripe. Minimum purchase 5,000 words.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
