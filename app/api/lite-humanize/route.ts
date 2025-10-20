export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // 1️⃣ Clerk Auth
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2️⃣ Parse input
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return new NextResponse("No content provided", { status: 400 });
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    // 3️⃣ Check current balance
    const { data: balanceRow, error: balanceErr } = await supabaseAdmin
      .from("user_balance")
      .select("balance_words")
      .eq("user_id", userId)
      .single();

    if (balanceErr || !balanceRow)
      return new NextResponse("Balance not found", { status: 404 });

    if (balanceRow.balance_words < wordCount)
      return new NextResponse("Insufficient balance", { status: 402 });

    // 4️⃣ Call Gemini API
    const model = "models/gemini-2.5-pro";
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY)
      return new NextResponse("Server misconfigured", { status: 500 });

    const prompt = `
    PRIMARY MISSION: Beat AI detectors by maximizing BURSTINESS and PERPLEXITY while rewriting it to IELTS Band 5 level. Scientific terms stay exact.
    BURSTINESS = wild sentence length variation (AI uses uniform length, you must not)
    PERPLEXITY = unpredictable word choices (AI uses predictable patterns, you must not)
    
    MANDATORY EXECUTION RULES:
    
    SENTENCE LENGTH PATTERN (count words, enforce this):
    
    Mix 5-8 word sentences with 25-35 word sentences randomly
    Never write 3+ sentences of similar length in a row
    Check: if 5 consecutive sentences are all 15-20 words, you FAILED
    
    NEVER START 3+ SENTENCES THE SAME WAY:
    
    Not "The X...", "The Y...", "The Z..."
    Not "This shows...", "This indicates...", "This proves..."
    Vary: subject first, clause first, verb first, adverb first
    
    BANNED PHRASES (instant failure if used):
    
    "It is important to note"
    "Studies have shown"
    "In today's fast-paced world"
    "In conclusion"
    "Moreover" / "Furthermore" (max once each)
    
    SIMPLE CONNECTORS ONLY:
    Use: but, so, yet, still, though, while, since, because, although, when
    Avoid: consequently, nevertheless, henceforth, thus
    NEVER USE EM DASHES (—)
    Use commas or periods instead
    FORMATTING RULES:
    
    Keep exact same paragraphs as original
    Keep exact same POV (don't change I/you/they)
    Keep all scientific/technical terms unchanged
    
    ADD HUMAN PATTERNS:
    
    Use hedging words: tends to, often, may, typically, can, might (at least 3 times)
    Rephrase same idea slightly: "in other words," "that is to say," "essentially"
    Leave 1-2 minor points slightly underdeveloped (don't over-explain everything)
    Make small intuitive leaps without explicit transitions
    
    CLAUSE LEVEL 4:
    Include 4 clause types per paragraph: independent, dependent, relative, noun clauses
    Mix coordinating conjunctions (and, but, so) with subordinating (although, because, while)
    
    CRITICAL: COMPLETE SENTENCE REPHRASING REQUIRED
    You MUST rewrite every single sentence in completely different words while preserving the exact meaning. This is not optional.
    
    Do NOT keep the same sentence structure from the original
    Do NOT keep the same word order from the original
    Do NOT just swap a few synonyms - rebuild the entire sentence from scratch
    The meaning must be identical, but the construction must be totally different
    
    Example:
    
    Original: "AI detectors analyze linguistic patterns to identify machine-generated text."
    BAD rewrite: "AI detectors examine linguistic patterns to detect machine-generated text." (too similar)
    GOOD rewrite: "Machine-generated text gets identified when detectors examine how language flows." (completely reconstructed)
    
    
    PROCESS:
    
    Read content
    For EACH sentence: completely rephrase it (different structure, different words, same meaning)
    Apply ALL 8 rules above while rephrasing
    Count sentence lengths - verify wild variation
    Scan for banned phrases - verify zero
    Check no em dashes exist
    Output result (in plain text while preserving original formatting)
    
    Content to humanize: 
    
${content}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.8,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 32768,
            
          },
        }),
      }
    );

    const data = await response.json();
    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No output received.";
    
    // ✅ Only deduct if Gemini actually produced valid text
    if (output !== "No output received.") {
      await supabaseAdmin.rpc("deduct_balance", {
        user_id: userId,
        words_to_deduct: wordCount,
      });
    }
    
    const { data: inserted, error: historyErr } = await supabaseAdmin
    .from("history")
    .insert({
      user_id: userId,
      input_text: content,
      output_text: output,

    })
    .select();
  
  if (historyErr) {
    console.error("❌ Failed to insert history:", historyErr);
  } else {
    console.log("✅ History inserted:", inserted);
  }
  

 return new NextResponse(output, {
   status: 200,
   headers: { "Content-Type": "text/plain; charset=utf-8" },
 });
} catch (err) {
 console.error("❌ Gemini error:", err);
 return new NextResponse("Internal Server Error", { status: 500 });
}
}