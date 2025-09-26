// app/api/humanize/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // server-side only
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text: string | undefined = body?.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

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

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      max_output_tokens: 800,
      temperature: 0.7,
    });

    // Try both modern output_text and legacy formats
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

    return NextResponse.json({ humanized });
  } catch (err: any) {
    console.error("Humanizer API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
