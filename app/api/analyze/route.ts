import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import PQueue from "p-queue";

export const runtime = "nodejs";

const queue = new PQueue({ concurrency: 2 });

async function generateWithRetry(model: any, payload: any) {
  const delays = [2000, 5000, 10000];

  for (let i = 0; i < delays.length; i++) {
    try {
      return await model.generateContent(payload);
    } catch (err: any) {
     if (err?.status === 429) {
            const retryAfter = 30000; // 30s minimum
            await new Promise(r => setTimeout(r, retryAfter));
        } else {
        throw err;
      }
    }
  }
}


export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cldName = process.env.CLOUDINARY_CLOUD_NAME;
    const cldKey = process.env.CLOUDINARY_API_KEY;
    const cldSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY in environment" },
        { status: 500 }
      );
    }
    if (!cldName || !cldKey || !cldSecret) {
      return NextResponse.json(
        { error: "Missing Cloudinary env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const instructions = (formData.get("instructions") as string | null) ?? "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mime = file.type;
    if (!mime || (!mime.startsWith("image/") && !mime.startsWith("video/"))) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload an image or video." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    // const base64 = Buffer.from(arrayBuffer).toString("base64");
    let base64: string;

if (mime.startsWith("image/")) {
  const resized = await sharp(Buffer.from(arrayBuffer))
    .resize({ width: 768 }) 
    .jpeg({ quality: 60 })
    .toBuffer();

  base64 = resized.toString("base64");
} else {
  base64 = Buffer.from(arrayBuffer).toString("base64");
}

    // Upload to Cloudinary first (temporary storage)
    cloudinary.config({ cloud_name: cldName, api_key: cldKey, api_secret: cldSecret });

    const dataUrl = `data:${mime};base64,${base64}`;
    const uploaded = await cloudinary.uploader.upload(dataUrl, {
      resource_type: "auto",
      folder: "gemini-temp",
      use_filename: true,
      unique_filename: true,
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    const requestedModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const candidateModels = [
      requestedModel,
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
    ];

    const prompt =
      instructions ||
      "Analyze the attached media and extract structured data you can infer. Return strict JSON with keys: media_type, extracted_items (array of {name, value, confidence}), summary, warnings. Keep values concise.";

    const generationConfig = {
      temperature: 0.2,
      maxOutputTokens: 800,
      responseMimeType: "application/json",
    } as const;

    const parts = [
      { text: prompt },
      // Gemini public API does not consume arbitrary external URLs directly;
      // we send inline data for analysis. Cloudinary holds the media temporarily.
      { inlineData: { mimeType: mime, data: base64 } },
    ];

    const payload = {
      contents: [{ role: "user", parts }],
      generationConfig,
    };

    let usedModel = "";
    let text = "";
    let lastErr: any = null;
    for (const m of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await queue.add(() => generateWithRetry(model, payload));
        text = result.response.text();
        usedModel = m;
        lastErr = null;
        break;
      }catch (err: any) {
  console.log("Model failed:", m, err?.status, err?.message);
  lastErr = err;

  if (err?.status !== 404) {
    break;
  }
}
    }
    if (lastErr && !text) {
      throw lastErr;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    return NextResponse.json({
      ok: true,
      mediaType: mime,
      model: usedModel,
      cloudinary: {
        public_id: uploaded.public_id,
        url: uploaded.secure_url,
        bytes: uploaded.bytes,
        resource_type: uploaded.resource_type,
      },
      result: parsed,
    });
  } catch (err: any) {
    console.error("/api/analyze error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}