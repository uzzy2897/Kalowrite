import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("contacts")
      .insert([{ name, email, message }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error saving contact:", err.message);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
