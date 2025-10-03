import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    // ✅ Clerk auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Parse request
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const wordCount = text.trim().split(/\s+/).length;

    // ✅ Check balance
    const { data: balance, error: balErr } = await supabaseAdmin
      .from("user_balance")
      .select("balance_words")
      .eq("user_id", userId)
      .single();

    if (balErr || !balance) {
      console.error("❌ Balance check failed:", balErr);
      return NextResponse.json({ error: "Balance check failed" }, { status: 500 });
    }

    if (balance.balance_words < wordCount) {
      return NextResponse.json({ error: "Not enough words" }, { status: 403 });
    }

    // ✅ Prompt
    const prompt = `
    Rewrite the following text so it reads like a natural human draft. 
    Follow these rules:
    - Vary sentence length and rhythm (short, long, fragmented).
    - Use everyday connectors (but, so, by the way, actually).
    - Allow small imperfections (occasional redundancy, contractions, casual tone).
    - Add human-like flow: mix formal and informal moments, as if written in one sitting.
    - Avoid robotic phrasing, overly balanced sentences, or excessive polish.
    - Keep meaning intact, but make it sound like a blog post, student essay, or personal note.
    
    
TEXT:
${text}
`;

    // ✅ Call OpenAI
    let output: string;
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a humanization engine for AI text." },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
      });

      output = response.choices[0]?.message?.content?.trim() || "";
    } catch (err) {
      console.error("❌ OpenAI API error:", err);
      return NextResponse.json({ error: "Failed to humanize text" }, { status: 500 });
    }

    if (!output) {
      return NextResponse.json({ error: "AI returned no content" }, { status: 500 });
    }

    // ✅ Deduct words
    const { error: deductErr } = await supabaseAdmin.rpc("deduct_balance", {
      uid: userId,
      amount: wordCount,
    });
    if (deductErr) {
      console.error("❌ deduct_balance failed:", deductErr);
      return NextResponse.json({ error: "Failed to deduct balance" }, { status: 500 });
    }

    // ✅ Save history
    const { error: historyErr } = await supabaseAdmin.from("history").insert({
      user_id: userId,
      input_text: text.trim(),
      output_text: output,
      words_used: wordCount,
    });

    if (historyErr) {
      console.error("❌ History insert failed:", historyErr);
      return NextResponse.json({ error: "Failed to save history" }, { status: 500 });
    }

    // ✅ Success
    return NextResponse.json({ result: output });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
