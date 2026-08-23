export type LeadStatus = "new" | "qualified" | "booked" | "nurture";
export type LeadIntent = "buyer" | "seller" | "renter" | "maintenance" | "unknown";
export type Channel = "whatsapp" | "telegram" | "web" | "phone";
export type ConversationStatus = "ai_handling" | "human_handling" | "closed";
export type CallStatus = "not_requested" | "requested" | "scheduled" | "completed";

export interface Qualification {
  budgetMin?: number;
  budgetMax?: number;
  budgetLabel?: string;
  location?: string;
  preferredAreas?: string[];
  financing?: "approved" | "cash" | "unknown";
  propertyType?: string;
  bedrooms?: number;
  timelineDays?: number;
  timeline?: string;
  viewingSelected?: boolean;
}

export interface Listing {
  id: string;
  name: string;
  title?: string;
  location: string;
  area?: string;
  price: number;
  priceDisplay: string;
  currency?: "MYR";
  beds: number;
  bedrooms?: number;
  baths: number;
  bathrooms?: number;
  sqft: number;
  sizeSqft?: number;
  description: string;
  image: string;
  imageUrl?: string;
  badge?: string;
  propertyType?: string;
  features?: string[];
  status?: "available" | "reserved" | "sold";
  featured?: boolean;
}

export interface ViewingSlot {
  id: string;
  label: string;
  appointmentAt: string;
  startAt?: string;
  available?: boolean;
}

export interface Viewing {
  bookingId: string;
  id: string;
  confirmed: boolean;
  appointmentAt: string;
  startAt?: string;
  leadId: string;
  listingId: string;
  slotId: string;
  /** absent for viewings booked over the phone — the agent records only a reference */
  listing?: Listing;
  propertyReference?: string;
  slot: ViewingSlot;
  channel?: Channel;
  status?: "pending" | "confirmed" | "cancelled";
}

export type MessageSender = "lead" | "ai" | "human" | "system";

export interface MessageMetadata {
  listings?: Listing[];
  slots?: ViewingSlot[];
  booking?: Viewing;
  actionType?: "qualification" | "listing_match" | "booking" | "call_request" | "handoff" | "knowledge_lookup";
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  sender: MessageSender;
  channel: Channel;
  content: string;
  createdAt: string;
  deliveryStatus?: "sent" | "delivered" | "read";
  metadata?: MessageMetadata;
  actions?: string[];
}

export interface TimelineEvent {
  id: string;
  type: "inquiry" | "ai_response" | "qualification" | "listing_match" | "viewing_booked" | "call_requested" | "handover" | "agent_note";
  title: string;
  description?: string;
  createdAt: string;
  agent?: string;
}

export interface Lead {
  id: string;
  name: string;
  phoneMasked: string;
  phone?: string;
  source: string;
  channel: Channel;
  intent: LeadIntent;
  location?: string;
  preferredAreas?: string[];
  budget?: string;
  budgetLabel: string;
  budgetMax?: number;
  budgetMin?: number;
  propertyType?: string;
  bedrooms?: number;
  financing?: "approved" | "cash" | "unknown";
  timeline?: string;
  score: number;
  scoreLabel: "Hot" | "Warm" | "Nurture";
  status: LeadStatus;
  conversationStatus: ConversationStatus;
  assignedAgent?: string;
  aiSummary: string;
  nextBestAction: string;
  callStatus: CallStatus;
  lastActivity: string;
  qualification: Qualification;
  conversation: ConversationMessage[];
  recommendedListings?: Listing[];
  bookedViewing?: Viewing;
  timelineEvents?: TimelineEvent[];
  sourcesUsed?: SourceCitation[];
  rulesApplied?: RuleAudit[];
  actions?: AgentAction[];
  handoffRequired?: boolean;
  telegramChatId?: number;
  elevenLabsCallId?: string;
}

export interface ChatRequest {
  sessionId: string;
  leadId?: string;
  message: string;
}

export interface ChatResponse {
  message: string;
  leadId?: string;
  qualification?: Qualification;
  listings?: Listing[];
  suggestedSlots?: ViewingSlot[];
  leadScore?: number;
  status?: LeadStatus;
  booking?: Viewing;
}

export interface BookingRequest {
  leadId: string;
  listingId: string;
  slotId: string;
  channel?: Channel;
}

export interface BookingResponse {
  bookingId: string;
  confirmed: boolean;
  appointmentAt: string;
  viewing?: Viewing;
  confirmationMessage?: string;
  leadScore?: number;
  leadStatus?: LeadStatus;
  nextBestAction?: string;
}

export type KnowledgeCategory = "Property brochure" | "Inventory" | "FAQ" | "Agency policy" | "Market data" | "Other";
export type KnowledgeScope = string;
export type KnowledgeStatus = "Processing" | "Indexing" | "Ready" | "Failed" | "Disabled" | "Pending" | "needs_review";

export interface KnowledgeSource {
  id: string;
  name: string;
  category: KnowledgeCategory;
  scope: KnowledgeScope;
  status: KnowledgeStatus;
  version: string;
  lastUpdated: string;
  enabled: boolean;
  size?: string;
  simulated?: boolean;
}

export type RulePriority = "High" | "Medium" | "Low";
export type RuleCategory = "Compliance" | "Escalation" | "Booking" | "Language" | "Other";

export interface AgentRule {
  id: string;
  title: string;
  instruction: string;
  priority: RulePriority;
  category: RuleCategory;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeTestResult {
  query: string;
  answer: string;
  sources: string[];
  rules: string[];
  handoff?: boolean;
  handoffReason?: string;
}

// ---------------------------------------------------------------------------
// New unified agent response types (live + demo)
// ---------------------------------------------------------------------------

export type SourceCategory = "brochure" | "inventory" | "faq" | "policy" | "market_data";

export interface SourceCitation {
  id: string;
  name: string;
  category: SourceCategory;
}

export interface RuleAudit {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
}

export type AgentAction =
  | "qualification"
  | "listing_match"
  | "booking"
  | "call_request"
  | "handoff"
  | "knowledge_lookup";

export interface AgentResponse {
  message: string;
  sessionId: string;
  leadId?: string;
  qualification?: Qualification;
  leadScore?: number;
  leadStatus?: LeadStatus;
  conversationStatus?: ConversationStatus;
  listings?: Listing[];
  suggestedSlots?: ViewingSlot[];
  viewing?: Viewing;
  sourcesUsed?: SourceCitation[];
  rulesApplied?: RuleAudit[];
  actions?: AgentAction[];
  nextBestAction?: string;
  handoffRequired?: boolean;
  error?: string;
}

export interface AgentChatRequest {
  sessionId: string;
  leadId?: string;
  channel?: Channel;
  message: string;
  conversation?: ConversationMessage[];
  qualification?: Qualification;
  leadName?: string;
}
