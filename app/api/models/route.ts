import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GOOGLE_API_KEY" }, { status: 500 });
    }
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `List models failed: ${res.status} ${res.statusText}`, detail: text },
        { status: 500 }
      );
    }
    const json = await res.json();
    return NextResponse.json({ ok: true, endpointVersion: "v1", ...json });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to list models" },
      { status: 500 }
    );
  }
}