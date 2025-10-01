// app/api/humanize/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // ⚠️ make sure you have this set up

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // server-side only
});

export async function POST(req: Request) {
  try {
    // 1) Get userId from Clerk (await!)
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Parse request body
    const body = await req.json();
    const text: string | undefined = body?.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // 3) Count words
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

    // 4) Fetch user balance
    const { data: balanceRow, error: balanceError } = await supabaseAdmin
      .from("user_balances")
      .select("balance, plan")
      .eq("user_id", userId)
      .maybeSingle();

    if (balanceError || !balanceRow) {
      console.error("❌ Balance fetch error:", balanceError);
      return NextResponse.json({ error: "Balance not found" }, { status: 500 });
    }

    const balance = balanceRow.balance;

    // 5) Reject if request words > balance
    if (wordCount > balance) {
      return NextResponse.json(
        {
          error: `Request blocked. You entered ${wordCount} words but only ${balance} remain.`,
        },
        { status: 400 }
      );
    }

    // 6) Prepare OpenAI prompt
    const prompt = `
Humanize the following content. Keep it professional while simplifying it but do NOT oversimplify it. 
Rewrite it to IELTS band 5 level. Humanize ANY and ALL sentence structures and writing style that AI 
typically uses. Use a variety of long and short sentences to increase burstiness and avoid robotic flow. 
Avoid common, overused phrases that AI often relies on. 

Rules:
- Sometimes circle back or leave thoughts slightly unfinished.
- Use everyday words at a high school level.
- Replace complex/academic terms with simpler ones.
- Forbidden words/phrases: delve, embark, enlightening, esteemed, shed light, craft, realm, game-changer, 
  unlock, discover, revolutionize, disruptive, utilize, dive deep, tapestry, illuminate, unveil, pivotal, 
  intricate, elucidate, hence, furthermore, harness, groundbreaking, cutting-edge, remarkable, testament, 
  landscape, navigate, ever-evolving, profound, arduous, in conclusion, in summary, moreover, it is important 
  to note, studies have shown, in today’s fast-paced world.
- Use simple connectors (and, but, so, because).
- Never use em dashes.
- Include slight redundancies, slips, or relatable specifics.
- Keep the formatting exactly as in the original text.
- The text must not lose complexity.
- The connectors must be creative, not formulaic.
- The output must feel like a real person wrote it.

Here’s the content to humanize:

${text}
`;

    // 7) Call OpenAI
    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      max_output_tokens: 800,
      temperature: 0.7,
    });

    // Handle both new + legacy output formats
    const humanized =
      (resp as any).output_text ??
      (Array.isArray((resp as any).output)
        ? (resp as any).output
            .map((o: any) =>
              Array.isArray(o.content)
                ? o.content.map((c: any) => c.text ?? "").join("")
                : ""
            )
            .join("\n")
        : "");

    // 8) Deduct words from balance
    const newBalance = Math.max(balance - wordCount, 0);
    const { error: updateError } = await supabaseAdmin
      .from("user_balances")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ Balance update error:", updateError);
    }

    // 9) Insert history record
    const { error: historyError } = await supabaseAdmin
      .from("humanize_history")
      .insert({
        user_id: userId,
        input_text: text,
        output_text: humanized,
        words_used: wordCount,
      });

    if (historyError) {
      console.error("❌ History insert error:", historyError);
    }

    // 10) Return response
    return NextResponse.json({ humanized, newBalance });
  } catch (err: any) {
    console.error("Humanizer API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
