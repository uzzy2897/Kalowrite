"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const posts = [
  {
    slug: "ai-writing-tips",
    title: "How to Write Human-like AI Content",
    excerpt:
      "Learn strategies to make AI-generated text sound more natural, engaging, and undetectable.",
    date: "2025-09-20",
  },
  {
    slug: "boost-productivity",
    title: "Boost Productivity with AI Tools",
    excerpt:
      "Discover how to integrate AI into your workflow to save time and focus on what really matters.",
    date: "2025-09-15",
  },
  {
    slug: "seo-and-ai",
    title: "AI Content & SEO: Best Practices",
    excerpt:
      "Understand how AI-generated content impacts search rankings and what to do about it.",
    date: "2025-09-10",
  },
];

export default function BlogPage() {
  return (
    <main className="max-w-5xl mx-auto py-16 px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-2">Our Blog</h1>
        <p className="text-muted-foreground">
          Insights, tutorials, and tips about AI writing and productivity.
        </p>
      </motion.div>

      {/* Blog posts list */}
      <div className="grid md:grid-cols-2 gap-8">
        {posts.map((post, i) => (
          <motion.div
            key={post.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="p-6 border rounded-xl bg-card shadow-sm hover:shadow-md transition"
          >
            <p className="text-sm text-muted-foreground mb-2">
              {new Date(post.date).toLocaleDateString()}
            </p>
            <h2 className="text-xl font-semibold mb-3">{post.title}</h2>
            <p className="text-muted-foreground mb-4">{post.excerpt}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="text-emerald-600 font-medium hover:underline"
            >
              Read more →
            </Link>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
