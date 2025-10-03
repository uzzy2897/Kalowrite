import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await req.json();
  
  const wordCount = text.trim().split(/\s+/).length;

  // Check balance
  const { data: balance } = await supabaseAdmin
    .from("user_balance")
    .select("balance_words")
    .eq("user_id", userId)
    .single();

  if (!balance || balance.balance_words < wordCount) {
    return NextResponse.json({ error: "Not enough words" }, { status: 403 });
  }

  // Prompt for OpenAI
  const prompt = `
You are the world's best human writer. Follow these strict rules:

- Rewrite text into IELTS band 5.5 style sentence structures, but keep vocabulary level at IELTS band 8.
- Remove all obvious AI-style phrasing. Add unpredictability, slips, and variety.
- No em dashes allowed. Use only commas, colons, or semicolons if needed.
- The output must feel naturally written by a human, not a machine.
- Return only the rewritten content, no explanations.

Here is the content to humanize:

${text}
`;

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
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json({ error: "Failed to humanize text" }, { status: 500 });
  }

  if (!output) {
    return NextResponse.json({ error: "AI returned no content" }, { status: 500 });
  }

  // Deduct words
  const { error: deductErr } = await supabaseAdmin.rpc("deduct_balance", {
    uid: userId,
    amount: wordCount,
  });
  if (deductErr) {
    console.error("❌ deduct_balance failed:", deductErr);
    return NextResponse.json({ error: "Failed to deduct balance" }, { status: 500 });
  }

  // Save history
  await supabaseAdmin.from("history").insert({
    user_id: userId,
    input_text: text,
    output_text: output,
    words_used: wordCount,
  });

  return NextResponse.json({ result: output });
}
