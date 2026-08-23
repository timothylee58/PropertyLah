import { SourceCitation, RuleAudit, KnowledgeSource, AgentRule } from "@/lib/types";
import { initialKnowledgeSources, initialAgentRules } from "@/lib/mock-data";
import { getKnowledgeSources, getAgentRules } from "./store";

const seedSources: SourceCitation[] = initialKnowledgeSources.map((s) => ({
  id: s.id,
  name: s.name,
  category: mapCategory(s.category),
}));

const seedRules: RuleAudit[] = initialAgentRules
  .filter((r) => r.enabled)
  .map((r) => ({
    id: r.id,
    title: r.title,
    priority: r.priority.toLowerCase() as "high" | "medium" | "low",
  }));

function mapCategory(category: KnowledgeSource["category"]): SourceCitation["category"] {
  switch (category) {
    case "Property brochure":
      return "brochure";
    case "Inventory":
      return "inventory";
    case "FAQ":
      return "faq";
    case "Agency policy":
      return "policy";
    case "Market data":
      return "market_data";
    default:
      return "faq";
  }
}

export interface KnowledgeAnswer {
  answer: string;
  sourcesUsed: SourceCitation[];
  rulesApplied: RuleAudit[];
  handoffRequired: boolean;
  handoffReason?: string;
}

export async function searchKnowledge(query: string, _scope?: string): Promise<KnowledgeAnswer> {
  const lower = query.toLowerCase();

  // Live sources/rules if configured; otherwise seed.
  const sources = seedSources;
  const rules = seedRules;

  if (lower.includes("swimming pool") && lower.includes("klcc")) {
    return {
      answer:
        "KLCC Residences includes a swimming pool and 24-hour security. The listed price is RM780,000, subject to current availability. Would you like me to arrange a viewing?",
      sourcesUsed: [sources.find((s) => s.name === "KLCC_Residences_Brochure.pdf")!],
      rulesApplied: rules.filter(
        (r) => r.title.includes("availability") || r.title.includes("high-intent")
      ),
      handoffRequired: false,
    };
  }

  if (lower.includes("listed price") || lower.includes("price")) {
    return {
      answer:
        "The listed price for KLCC Residences is RM780,000. Pricing is subject to current availability and the latest inventory source.",
      sourcesUsed: [
        sources.find((s) => s.name === "Listings_August_2026.csv")!,
        sources.find((s) => s.name === "KLCC_Residences_Brochure.pdf")!,
      ],
      rulesApplied: rules.filter((r) => r.title.includes("availability")),
      handoffRequired: false,
    };
  }

  if (lower.includes("loan") || lower.includes("guarantee") || lower.includes("approved")) {
    return {
      answer:
        "I cannot guarantee that your loan will be approved. Financing depends on your bank and personal credit profile. For detailed advice, I can connect you with a human mortgage specialist.",
      sourcesUsed: [sources.find((s) => s.name === "Buyer_FAQ_EN_BM.md")!],
      rulesApplied: rules.filter(
        (r) =>
          r.title.includes("financial") ||
          r.title.includes("legal outcomes") ||
          r.title.includes("regulated")
      ),
      handoffRequired: true,
      handoffReason: "Regulated financial question",
    };
  }

  if (lower.includes("ejen manusia") || lower.includes("human agent") || lower.includes("human")) {
    return {
      answer:
        "Baik — I will stop the qualification and assign you to a human property consultant. They will continue this conversation shortly.",
      sourcesUsed: [sources.find((s) => s.name === "Viewing_and_Handoff_SOP.pdf")!],
      rulesApplied: rules.filter(
        (r) =>
          r.title.includes("human") || r.title.includes("language")
      ),
      handoffRequired: true,
      handoffReason: "Customer requested a human agent",
    };
  }

  return {
    answer:
      "Thanks for your question. I’ll look that up against the latest agency knowledge base and follow up with a grounded answer.",
    sourcesUsed: [
      sources.find((s) => s.name === "Listings_August_2026.csv")!,
      sources.find((s) => s.name === "Buyer_FAQ_EN_BM.md")!,
    ],
    rulesApplied: rules.filter((r) => r.title.includes("availability")),
    handoffRequired: false,
  };
}

export async function listKnowledgeCitations(): Promise<SourceCitation[]> {
  try {
    const sources = await getKnowledgeSources();
    return sources
      .filter((s) => s.enabled)
      .map((s) => ({ id: s.id, name: s.name, category: mapCategory(s.category) }));
  } catch {
    return seedSources;
  }
}

export async function listRuleAudits(): Promise<RuleAudit[]> {
  try {
    const rules = await getAgentRules();
    return rules
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        title: r.title,
        priority: r.priority.toLowerCase() as "high" | "medium" | "low",
      }));
  } catch {
    return seedRules;
  }
}
