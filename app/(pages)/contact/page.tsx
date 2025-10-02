"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ContactPage = () => {
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const body = {
      name: form.get("name"),
      email: form.get("email"),
      message: form.get("message"),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        formEl.reset();
        setShowOverlay(true); // ✅ show success overlay
      } else {
        setError("❌ Failed to send message. Please try again.");
      }
    } catch (err) {
      setError("⚠️ Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4 relative">
      <h1 className="text-3xl font-bold">Contact Us</h1>
      <p>
        Contact us using the form below or email us at{" "}
        <span className="font-semibold">support@kalowrite.com</span>
      </p>

      <form className="space-y-6 mt-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="name">Name</label>
          <Input id="name" name="name" placeholder="Your name" />
        </div>

        <div className="space-y-2">
          <label htmlFor="email">Email</label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" />
        </div>

        <div className="space-y-2">
          <label htmlFor="message">Message</label>
          <Textarea id="message" name="message" placeholder="Write your message..." rows={4} />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send Message"}
        </Button>
      </form>

      {error && (
        <p className="mt-4 text-center text-sm text-red-500">{error}</p>
      )}

      {/* ✅ Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card p-8 rounded-lg shadow-xl max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4 text-emerald-500">
              🎉 Message Sent!
            </h2>
            <p className="">
              Thank you! We’ve received your message and will get back to you
              within <strong>24-48 hours</strong>.
            </p>
            <button
              onClick={() => setShowOverlay(false)}
              className="mt-6 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-md transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactPage;
