"use client";

import BuyCreditsButton from "@/components/BuyCreditsButton";
import { TypographyH1, TypographyP } from "@/components/Typography";
import { Badge } from "@/components/ui/badge";
import { PricingTable } from "@clerk/nextjs";
import { motion } from "framer-motion";


const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay },
  }),
};

export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-20 py-20">
      {/* 🔹 Subscriptions Section */}
      <motion.section
        className="flex flex-col items-center text-center gap-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
      >
        <motion.div variants={fadeUp} custom={0}>
          <Badge className="mb-2">Choose Your Plan</Badge>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.2}>
          <TypographyH1>
            Simple, Transparent Pricing <br />
            <span className="text-emerald-500">No Hidden Fees</span>
          </TypographyH1>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.4}>
          <TypographyP>
            Get started for free and upgrade anytime. Cancel anytime, no
            questions asked.
          </TypographyP>
        </motion.div>
      </motion.section>

      <PricingTable />

      {/* 🔹 One-Time Stripe Top-Ups */}
      <motion.section
        className="flex flex-col items-center text-center gap-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
      >
        <motion.div variants={fadeUp} custom={0.2}>
          <Badge className="mb-2">Need More Credits?</Badge>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.4}>
          <TypographyH1>
            Top-Up Your Balance <br />
            <span className="text-emerald-500">Pay Once, Use Anytime</span>
          </TypographyH1>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.6}>
          <TypographyP>
            Don’t want a subscription? Buy extra credits with a simple one-time
            payment via Stripe Checkout.
          </TypographyP>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.8} className="flex gap-4">
          {/* ✅ Buttons for different packs */}
          <BuyCreditsButton priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_100!} label="Buy 100 Credits" />
          <BuyCreditsButton priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_500!} label="Buy 500 Credits" />
        </motion.div>
      </motion.section>
    </div>
  );
}
