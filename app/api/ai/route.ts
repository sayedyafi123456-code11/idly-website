import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { mode, message, profile } = await req.json();
    if (typeof message !== "string" || !message.trim() || message.length > 4000) {
      return NextResponse.json({ error: "Please enter a message under 4,000 characters." }, { status: 400 });
    }
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "AI is not configured yet. Add OPENAI_API_KEY on the server." }, { status: 503 });
    const system = mode === "profile"
      ? "You are IDLY Profile Assistant. Help users write a clear, safe profile bio. Never ask for passwords, exact home addresses, government IDs, or other sensitive personal data. Return concise suggestions."
      : "You are IDLY AI, a friendly assistant for a profile community. Give helpful, respectful answers. Never reveal private profile information or help users find someone's sensitive data.";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system }, { role: "user", content: mode === "profile" ? `Profile context: ${JSON.stringify(profile || {})}\nRequest: ${message}` : message }],
        max_tokens: 500
      })
    });
    if (!response.ok) return NextResponse.json({ error: "The AI service could not complete that request." }, { status: 502 });
    const data = await response.json();
    return NextResponse.json({ reply: data.choices?.[0]?.message?.content || "I couldn't generate a reply." });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}