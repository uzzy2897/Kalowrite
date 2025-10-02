"use client";

import FAQ from '@/components/sections/FAQ';
import Hero from '@/components/sections/Hero';
import PartOne from '@/components/sections/Section1';
import PartTwo from '@/components/sections/Section2';
import CompareHumanize from '@/components/sections/Section3';
import Section4 from '@/components/sections/Section4';
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

// Animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (custom: number = 1) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.15,
      duration: 0.6,
      ease: "easeOut" as const,
    },
  }),
};

const Page = () => {
  return (
    <>
      {/* While Clerk is still loading */}
      <ClerkLoading>
        <div className="flex h-screen items-center justify-center bg-background">
          {/* Spinning circle with glowing effect */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            {/* Outer glowing ring */}
            <div className="absolute w-24 h-24 bg-emerald-950 rounded-full border-4 border-primary/30 animate-pulse" />
            <div className="absolute w-24 h-24 bg-emerald-950 rounded-full border-4 border-primary blur-sm opacity-60" />

            {/* Inner logo */}
            <div className="w-12 h-12 flex items-center z-10 justify-center bg-emerald-950 rounded-full shadow-lg">
              {/* Replace with your logo image or text */}
             <img src="/logo1.png" alt="" />
      
            </div>
        
          </motion.div>
        </div>
      </ClerkLoading>

      {/* Only render once Clerk is ready */}
      <ClerkLoaded>
        <main className="px-4 lg:px-8 max-w-7xl mx-auto space-y-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            custom={0}
          >
            <Hero />
          </motion.div>

          {[PartOne, PartTwo, CompareHumanize, Section4, FAQ].map((Section, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeInUp}
              custom={i + 1}
            >
              <Section />
            </motion.div>
          ))}
        </main>
      </ClerkLoaded>
    </>
  );
};

export default Page;
