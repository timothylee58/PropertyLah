export type LeadStatus = "new" | "qualified" | "booked" | "nurture";
export type LeadIntent = "buyer" | "seller" | "renter" | "maintenance" | "unknown";
export type Channel = "whatsapp" | "web" | "phone";
export type ConversationStatus = "ai_handling" | "human_handling" | "closed";
export type CallStatus = "not_requested" | "requested" | "scheduled" | "completed";

export interface Qualification {
  budgetMin?: number;
  budgetMax?: number;
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
  location: string;
  price: number;
  priceDisplay: string;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  image: string;
  badge?: string;
}

export interface ViewingSlot {
  id: string;
  label: string;
  appointmentAt: string;
}

export interface Viewing {
  bookingId: string;
  confirmed: boolean;
  appointmentAt: string;
  leadId: string;
  listingId: string;
  slotId: string;
  /** absent for viewings booked over the phone — the agent records only a reference */
  listing?: Listing;
  propertyReference?: string;
  slot: ViewingSlot;
  channel?: Channel;
}

export type MessageSender = "lead" | "ai" | "human" | "system";

export interface MessageMetadata {
  listings?: Listing[];
  slots?: ViewingSlot[];
  booking?: Viewing;
  actionType?: "qualification" | "listing_match" | "booking" | "call_request";
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

export interface Lead {
  id: string;
  name: string;
  phoneMasked: string;
  source: string;
  channel: Channel;
  intent: LeadIntent;
  location?: string;
  preferredAreas?: string[];
  budget?: string;
  budgetLabel: string;
  budgetMax?: number;
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
}

export interface TimelineEvent {
  id: string;
  type: "inquiry" | "ai_response" | "qualification" | "listing_match" | "viewing_booked" | "call_requested" | "handover" | "agent_note";
  title: string;
  description?: string;
  createdAt: string;
  agent?: string;
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
}

export interface BookingResponse {
  bookingId: string;
  confirmed: boolean;
  appointmentAt: string;
}
