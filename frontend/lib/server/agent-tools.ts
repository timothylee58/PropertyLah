import { AgentResponse, ConversationMessage, Listing, Qualification, Viewing, ViewingSlot } from "@/lib/types";
import * as store from "./store";
import { calculateLeadScore, scoreLabel } from "./score";
import { searchKnowledge, listRuleAudits, listKnowledgeCitations } from "./knowledge";

export interface ToolContext {
  sessionId: string;
  leadId?: string;
  leadName?: string;
  channel?: "whatsapp" | "web" | "phone";
  qualification: Qualification;
  conversation: ConversationMessage[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  name: string;
  result: unknown;
}

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "search_listings",
      description:
        "Search the approved agency inventory for available listings matching the lead's budget, location, bedrooms and property type.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Preferred area or city" },
          max_price: { type: "number", description: "Maximum budget in MYR" },
          bedrooms: { type: "number" },
          property_type: { type: "string" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_viewing_slots",
      description:
        "Return the next available viewing slots for a lead and a specific listing.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          listing_id: { type: "string" },
        },
        required: ["lead_id", "listing_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_viewing",
      description:
        "Book a viewing for a lead, listing and chosen slot. Updates the CRM.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          listing_id: { type: "string" },
          slot_id: { type: "string" },
          channel: { type: "string", enum: ["whatsapp", "web", "phone"] },
        },
        required: ["lead_id", "listing_id", "slot_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_lead",
      description: "Load the current lead profile and qualification.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_lead",
      description:
        "Update the lead's qualification fields after capturing new information.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          budget_min: { type: "number" },
          budget_max: { type: "number" },
          financing: { type: "string", enum: ["approved", "cash", "unknown"] },
          preferred_areas: { type: "array", items: { type: "string" } },
          property_type: { type: "string" },
          bedrooms: { type: "number" },
          timeline: { type: "string" },
          timeline_days: { type: "number" },
        },
        required: ["lead_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_knowledge",
      description:
        "Ask a question against the agency knowledge base and rules.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_active_rules",
      description: "Return the currently enabled agent rules.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "request_call",
      description:
        "Record that the lead has requested an AI or human call.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          call_type: { type: "string", enum: ["ai", "human"] },
          listing_id: { type: "string" },
        },
        required: ["lead_id", "call_type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "handoff_to_human",
      description:
        "Transition the conversation to a human property consultant.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["lead_id"],
      },
    },
  },
];

function now() {
  return new Date().toISOString();
}

export async function executeTools(calls: ToolCall[], ctx: ToolContext): Promise<{ results: ToolResult[]; state: Partial<AgentResponse> }> {
  const results: ToolResult[] = [];
  const state: Partial<AgentResponse> = {
    actions: [],
    sourcesUsed: [],
    rulesApplied: [],
  };

  for (const call of calls) {
    const args = call.arguments || {};
    switch (call.name) {
      case "search_listings": {
        const listings = store.searchListings({
          location: asString(args.location),
          maxPrice: asNumber(args.max_price),
          bedrooms: asNumber(args.bedrooms),
          propertyType: asString(args.property_type),
        });
        results.push({ name: call.name, result: { listings } });
        state.listings = listings;
        state.actions = [...(state.actions || []), "listing_match"];
        break;
      }

      case "get_viewing_slots": {
        const slots = store.getSlots().map((s) => ({ ...s, available: true }));
        results.push({ name: call.name, result: { slots } });
        state.suggestedSlots = slots;
        state.actions = [...(state.actions || []), "booking"];
        break;
      }

      case "create_viewing": {
        const leadId = asString(args.lead_id) || ctx.leadId || "";
        const listingId = asString(args.listing_id) || "";
        const slotId = asString(args.slot_id) || "";
        const listing = store.getListing(listingId);
        const slot = store.getSlot(slotId);
        if (!listing || !slot) {
          results.push({ name: call.name, result: { error: "Listing or slot not found" } });
          break;
        }
        const bookingId = `bkg-${Date.now()}`;
        const viewing: Viewing = {
          bookingId,
          id: bookingId,
          confirmed: true,
          appointmentAt: slot.appointmentAt,
          leadId,
          listingId,
          slotId,
          listing,
          slot,
          channel: (args.channel as Viewing["channel"]) || ctx.channel || "whatsapp",
          status: "confirmed",
        };
        await store.addViewing(viewing);

        // Update lead if present
        const lead = await store.getLead(leadId);
        if (lead) {
          lead.bookedViewing = viewing;
          lead.status = "booked";
          lead.score = calculateLeadScore(lead.qualification);
          lead.scoreLabel = scoreLabel(lead.score);
          lead.nextBestAction =
            "Send the property brochure before the viewing and offer a follow-up call.";
          lead.lastActivity = now();
          lead.timelineEvents = lead.timelineEvents || [];
          lead.timelineEvents.unshift({
            id: `te-${Date.now()}`,
            type: "viewing_booked",
            title: `Viewing confirmed: ${slot.label}`,
            createdAt: now(),
          });
          await store.updateLead(lead);
        }

        results.push({ name: call.name, result: { viewing, confirmed: true } });
        state.viewing = viewing;
        state.leadStatus = "booked";
        state.leadScore = lead?.score ?? calculateLeadScore(ctx.qualification);
        state.nextBestAction =
          "Send the property brochure before the viewing and offer a follow-up call.";
        state.actions = [...(state.actions || []), "booking"];
        break;
      }

      case "get_lead": {
        const lead = await store.getLead(asString(args.lead_id) || ctx.leadId || "");
        results.push({ name: call.name, result: { lead } });
        break;
      }

      case "update_lead": {
        const leadId = asString(args.lead_id) || ctx.leadId || `lead-${Date.now()}`;
        const lead = (await store.getLead(leadId)) || {
          id: leadId,
          name: ctx.leadName || "Lead",
          phoneMasked: "+60 **-**** ****",
          source: "KeyNest AI",
          channel: ctx.channel || "whatsapp",
          intent: "buyer",
          budgetLabel: "TBD",
          score: 0,
          scoreLabel: "Nurture",
          status: "new",
          conversationStatus: "ai_handling",
          aiSummary: "",
          nextBestAction: "",
          callStatus: "not_requested",
          lastActivity: now(),
          qualification: {},
          conversation: [],
        } as unknown as import("@/lib/types").Lead;

        const q: Qualification = { ...ctx.qualification };
        if (args.budget_min != null) q.budgetMin = asNumber(args.budget_min);
        if (args.budget_max != null) q.budgetMax = asNumber(args.budget_max);
        if (args.financing) q.financing = args.financing as Qualification["financing"];
        if (args.preferred_areas) q.preferredAreas = asStringArray(args.preferred_areas);
        if (args.property_type) q.propertyType = asString(args.property_type);
        if (args.bedrooms != null) q.bedrooms = asNumber(args.bedrooms);
        if (args.timeline) q.timeline = asString(args.timeline);
        if (args.timeline_days != null) q.timelineDays = asNumber(args.timeline_days);

        lead.qualification = q;
        lead.budgetMax = q.budgetMax;
        if (q.budgetMax) lead.budgetLabel = `Up to RM${q.budgetMax.toLocaleString()}`;
        if (q.preferredAreas?.length) lead.location = q.preferredAreas.join(" / ");
        if (q.propertyType) lead.propertyType = q.propertyType;
        if (q.bedrooms != null) lead.bedrooms = q.bedrooms;
        if (q.financing) lead.financing = q.financing;
        if (q.timeline) lead.timeline = q.timeline;
        lead.score = calculateLeadScore(q);
        lead.scoreLabel = scoreLabel(lead.score);
        if (lead.score >= 80 && lead.status !== "booked") lead.status = "qualified";
        lead.lastActivity = now();
        await store.updateLead(lead);

        results.push({ name: call.name, result: { lead, qualification: q } });
        state.qualification = q;
        state.leadScore = lead.score;
        state.leadStatus = lead.status;
        state.actions = [...(state.actions || []), "qualification"];
        break;
      }

      case "search_knowledge": {
        const answer = await searchKnowledge(asString(args.query) || "");
        results.push({ name: call.name, result: answer });
        state.sourcesUsed = [...(state.sourcesUsed || []), ...answer.sourcesUsed];
        state.rulesApplied = [...(state.rulesApplied || []), ...answer.rulesApplied];
        if (answer.handoffRequired) {
          state.handoffRequired = true;
          state.conversationStatus = "human_handling";
          state.actions = [...(state.actions || []), "handoff"];
        } else {
          state.actions = [...(state.actions || []), "knowledge_lookup"];
        }
        break;
      }

      case "get_active_rules": {
        const rules = await listRuleAudits();
        results.push({ name: call.name, result: { rules } });
        state.rulesApplied = [...(state.rulesApplied || []), ...rules];
        break;
      }

      case "request_call": {
        const leadId = asString(args.lead_id) || ctx.leadId || "";
        const lead = await store.getLead(leadId);
        if (lead) {
          lead.callStatus = "requested";
          lead.lastActivity = now();
          lead.timelineEvents = lead.timelineEvents || [];
          lead.timelineEvents.unshift({
            id: `te-${Date.now()}`,
            type: "call_requested",
            title: `AI ${asString(args.call_type)} call requested`,
            createdAt: now(),
          });
          await store.updateLead(lead);
        }
        results.push({ name: call.name, result: { callStatus: "requested" } });
        state.actions = [...(state.actions || []), "call_request"];
        break;
      }

      case "handoff_to_human": {
        const leadId = asString(args.lead_id) || ctx.leadId || "";
        const lead = await store.getLead(leadId);
        if (lead) {
          lead.conversationStatus = "human_handling";
          lead.lastActivity = now();
          lead.timelineEvents = lead.timelineEvents || [];
          lead.timelineEvents.unshift({
            id: `te-${Date.now()}`,
            type: "handover",
            title: "Conversation handed to human agent",
            description: asString(args.reason),
            createdAt: now(),
          });
          await store.updateLead(lead);
        }
        results.push({ name: call.name, result: { conversationStatus: "human_handling" } });
        state.conversationStatus = "human_handling";
        state.handoffRequired = true;
        state.actions = [...(state.actions || []), "handoff"];
        break;
      }

      default:
        results.push({ name: call.name, result: { error: "Unknown tool" } });
    }
  }

  return { results, state };
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string") as string[];
  return undefined;
}
