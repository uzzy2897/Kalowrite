// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Pick the right model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function humanizeWithGemini(prompt: string) {
  const result = await model.generateContent(prompt);
  return result.response.text(); // Extract text only
}
