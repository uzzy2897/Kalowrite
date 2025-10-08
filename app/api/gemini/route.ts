export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
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

    // 3️⃣ Check balance (admin client because it's privileged)
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
**You are the world's best human writer...**
(Text to humanize below)

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
            temperature: 2.0,
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

    // 5️⃣ Deduct balance using RPC
    await supabaseAdmin.rpc("deduct_balance", {
      user_id: userId,
      words_to_deduct: wordCount,
    });

    // 6️⃣ Insert history using user Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${req.headers.get("authorization")}` } },
    });

    const { error: historyErr } = await supabase
      .from("history")
      .insert({
        user_id: userId,
        input_text: content,
        output_text: output,
        word_used: wordCount,
      });

    if (historyErr) console.error("❌ Failed to insert history:", historyErr.message);

    // ✅ Return humanized text
    return new NextResponse(output, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("❌ Gemini error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
