"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

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
        setShowOverlay(true);
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-2xl mx-auto p-6 space-y-4 relative"
    >
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-bold"
      >
        Contact Us
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Contact us using the form below or email us at{" "}
        <span className="font-semibold">support@kalowrite.com</span>
      </motion.p>

      {/* Form */}
      <motion.form
        className="space-y-6 mt-6"
        onSubmit={handleSubmit}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.15 } },
        }}
      >
        {[
          { id: "name", label: "Name", type: "text", placeholder: "Your name" },
          {
            id: "email",
            label: "Email",
            type: "email",
            placeholder: "you@example.com",
          },
        ].map((field) => (
          <motion.div
            key={field.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <label htmlFor={field.id}>{field.label}</label>
            <Input
              id={field.id}
              name={field.id}
              type={field.type}
              placeholder={field.placeholder}
            />
          </motion.div>
        ))}

        {/* Message field */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <label htmlFor="message">Message</label>
          <Textarea
            id="message"
            name="message"
            placeholder="Write your message..."
            rows={4}
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </motion.div>
      </motion.form>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-sm text-red-500"
        >
          {error}
        </motion.p>
      )}

      {/* ✅ Overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-card p-8 rounded-lg shadow-xl max-w-md text-center"
            >
              <h2 className="text-2xl font-bold mb-4 text-emerald-500">
                🎉 Message Sent!
              </h2>
              <p>
                Thank you! We’ve received your message and will get back to you
                within <strong>24-48 hours</strong>.
              </p>
              <button
                onClick={() => setShowOverlay(false)}
                className="mt-6 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-md transition"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ContactPage;
