import { NextRequest, NextResponse } from "next/server";
import { KnowledgeSource } from "@/lib/types";
import * as store from "@/lib/server/store";

export const runtime = "nodejs";

function deriveCategory(name: string): KnowledgeSource["category"] {
  const lower = name.toLowerCase();
  if (lower.includes("brochure")) return "Property brochure";
  if (lower.includes("listing") || lower.includes("inventory")) return "Inventory";
  if (lower.includes("faq")) return "FAQ";
  if (lower.includes("sop") || lower.includes("policy")) return "Agency policy";
  if (lower.includes("napic") || lower.includes("transaction") || lower.includes("market")) return "Market data";
  return "Other";
}

export async function GET() {
  try {
    const sources = await store.getKnowledgeSources();
    return NextResponse.json(sources);
  } catch (err) {
    console.error("GET /api/knowledge/sources error:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "";
    const scope = (formData.get("scope") as string) || "All conversations";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id = `ks-${Date.now()}`;
    const source: KnowledgeSource = {
      id,
      name: file.name,
      category: (category as KnowledgeSource["category"]) || deriveCategory(file.name),
      scope,
      status: "Processing",
      version: "1.0",
      lastUpdated: now,
      enabled: true,
      size: `${(file.size / 1024).toFixed(0)} KB`,
      simulated: process.env.NEXT_PUBLIC_DEMO_MODE !== "false" || !process.env.SUPABASE_URL,
    };

    // Store metadata only. Without real extraction/pipeline, mark pending.
    const hasPipeline = Boolean(process.env.SUPABASE_URL && process.env.QWEN_API_KEY);
    source.status = hasPipeline ? "Processing" : "Pending";

    await store.updateKnowledgeSource(source);

    // Simulate indexing flow if in demo or no pipeline.
    if (!hasPipeline) {
      setTimeout(async () => {
        const current = await store.getKnowledgeSource(id);
        if (current && current.status === "Pending") {
          await store.updateKnowledgeSource({ ...current, status: "Indexing" });
        }
      }, 1200);
      setTimeout(async () => {
        const current = await store.getKnowledgeSource(id);
        if (current && current.status === "Indexing") {
          await store.updateKnowledgeSource({ ...current, status: "Ready" });
        }
      }, 3500);
    }

    return NextResponse.json(source);
  } catch (err) {
    console.error("POST /api/knowledge/sources error:", err);
    return NextResponse.json({ error: "Unable to upload knowledge source" }, { status: 500 });
  }
}
