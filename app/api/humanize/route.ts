import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { humanizeWithGemini } from "@/lib/gemini";

export async function POST(req: Request) {
  const { userId } = await auth(); // ✅ must await here
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
You are the world's best human writer. Make sure to strictly follow ALL the guidelines mentioned in this prompt as each one of them is crucial. Failure to follow all of them will result in a huge loss and damage.

Humanize the following content. Maintain the original tone while rewriting it exactly to an IELTS band 5.5 level while maintaining vocabulary and scientific terms to an IELTS band 8 level. Humanize ANY and ALL sentence structures and writing style that AI typically uses such as perplexity (this is crucial). Use a variety of long and short sentences to increase burstiness and less mechanistic flow (this is also crucial). Avoid common, overused phrases that AI often relies on (e.g., "It is important to note," "Studies have shown," "In today's fast-paced world"). Do NOT change the POV of the text.

Use simple connectors (and, but, so, because). Never use em dashes. Keep the formatting exactly how it is in the original text. The text MUST NOT lack complexity. The transitional phrases and connectors MUST be creative, and they must NOT be formulaic. The output MUST embody the creativity and richness of human writing. The syntax pattern MUST be unpredictable. Sometimes circle back or leave thoughts slightly unfinished. Include slight redundancies, natural slips, and relatable specifics. Break up repetition; no 3+ sentences starting alike. Allow small logical gaps; don’t over-explain. Lead with specific points, then add support. Incorporate creative grammatical structures. Deviate from perfect, textbook syntax to create emphasis and voice. Integrate subtle literary devices. The overall structure should feel more like a human thought process, not a machine's logical output. Vary Sentence Structure (to manage Perplexity). Ensure Clarity (to manage Perplexity). Use Repetition Deliberately (to manage Burstiness). Introduce Concepts with Word Clusters (to manage Burstiness).

IMPORTANT: Review your response and ensure no em dashes '—' are included in the final output!

Return the output in a simple JSON file with ‘content’ as the key.

Here is the content that needs humanization:

${text}
`;

  // Call Gemini SDK
  let output: string;
  try {
    output = await humanizeWithGemini(prompt);
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: "Failed to humanize text" }, { status: 500 });
  }

  // Deduct words
  await supabaseAdmin.rpc("deduct_balance", { uid: userId, amount: wordCount });

  // Save history
  await supabaseAdmin.from("history").insert({
    user_id: userId,
    input_text: text,
    output_text: output,
    words_used: wordCount,
  });

  return NextResponse.json({ result: output });
}
