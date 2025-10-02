import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { humanizeWithGemini } from "@/lib/gemini";

export async function POST(req: Request) {
  const { userId } = await auth(); // ✅ Clerk session
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await req.json();
  const wordCount = text.trim().split(/\s+/).length;

  // Balance check
  const { data: balance } = await supabaseAdmin
    .from("user_balance")
    .select("balance_words")
    .eq("user_id", userId)
    .single();

  if (!balance || balance.balance_words < wordCount) {
    return NextResponse.json({ error: "Not enough words" }, { status: 403 });
  }

  // Build humanizer prompt
  const prompt = `
You are the world's best human writer...

Return ONLY valid JSON in the format: 
{
  "content": "your rewritten humanized text"
}

Here is the content that needs humanization:

${text}
`;

  // Call Gemini
  let output: string;
  try {
    const raw = await humanizeWithGemini(prompt);

    // Try parsing JSON
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
      output = parsed.content || raw;
    } catch {
      // If Gemini returned plain text, fallback
      output = raw;
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: "Failed to humanize text" }, { status: 500 });
  }

  // Deduct words
  const { error: deductErr } = await supabaseAdmin.rpc("deduct_balance", { 
    uid: userId, 
    amount: wordCount 
  });
  if (deductErr) console.error("❌ deduct_balance failed:", deductErr);

  // Save history
  const { error: histErr } = await supabaseAdmin.from("history").insert({
    user_id: userId,
    input_text: text,
    output_text: output,
    words_used: wordCount,
  });
  if (histErr) console.error("❌ history insert failed:", histErr);

  return NextResponse.json({ result: output });
}
