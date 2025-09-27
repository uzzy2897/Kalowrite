"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const faqItems = [
  {
    question: "How does KaloWrite work?",
    answer:
      "KaloWrite is an AI content humanizer that converts your robotic AI text into natural, human sounding text within seconds. It helps you bypass some of the best AI detectors such as GPT Zero, Turnitin, Sapling.ai etc…",
  },
  {
    question: "Is KaloWrite free?",
    answer:
      "Paste your AI text into the input, press Humanize, and receive the transformed text in seconds — that’s the 3-step flow shown on the site.",
  },
  {
    question: "How do I use KaloWrite?",
    answer:
      "KaloWrite edits semantics, sentence structure, and stylistic patterns (e.g., perplexity/burstiness) so the text reads more naturally and less “robotic.”",
  },
  {
    question: "What does “humanize” mean?",
    answer:
      "KaloWrite edits semantics, sentence structure, and stylistic patterns (e.g., perplexity/burstiness) so the text reads more naturally and less “robotic.”",
  },
  {
    question: "Is it ethical/legal to use KaloWrite to evade AI detection?",
    answer:
      "Ethical and legal implications depend on your use case (e.g., academic submissions, regulated disclosures). We recommend using KaloWrite responsibly and in compliance with institutional or legal policies.",
  },
  {
    question: "What happens to the text I paste? Is it saved?",
    answer:
      "Yes, your previous humanized content is all saved in your dashboard.",
  },
]

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)
  
    const toggleItem = (index: number) => {
      setOpenIndex(openIndex === index ? null : index)
    }
  
    return (
        <section>
                  <h2 className=" lg:text-4xl mb-6 text-center font-bold">Frequent asked questions</h2>

      <div className="flex flex-col gap-4 ">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index
  
          return (
            <div
              key={index}
              className="border rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="flex justify-between items-center w-full px-4 py-4 bg-accent/50 text-left text-xs font-semibold lg:text-xl"
              >
                {item.question}
                <div className="p-2 border rounded-full bg-white">
                  {isOpen ? <Minus className="h-5 w-5 text-black" /> : <Plus className="h-5 w-5 text-black" />}
                </div>
              </button>
  
              <motion.div
                initial={{ maxHeight: 0, opacity: 0 }}
                animate={{ maxHeight: isOpen ? 200 : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden text-base text-muted-foreground px-4"
              >
                <div className="py-2">{item.answer}</div>
              </motion.div>
            </div>
          )
        })}
      </div>
      </section>
    )
  }