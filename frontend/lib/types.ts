export type LeadStatus = "new" | "qualified" | "booked" | "cold";
export type LeadIntent = "Buyer" | "Seller" | "Renter";

export interface Qualification {
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  financing?: boolean;
  propertyType?: string;
  bedrooms?: number;
  timelineDays?: number;
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
  listing: Listing;
  slot: ViewingSlot;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: string;
  listings?: Listing[];
  slots?: ViewingSlot[];
  booking?: { listing: Listing; slot: ViewingSlot };
  actions?: string[];
}

export interface Lead {
  id: string;
  name: string;
  source: string;
  intent: LeadIntent;
  location?: string;
  budget?: string;
  budgetMax?: number;
  score: number;
  status: LeadStatus;
  lastActivity: string;
  qualification: Qualification;
  conversation: ConversationMessage[];
  recommendedListings?: Listing[];
  bookedViewing?: Viewing;
  nextBestAction?: string;
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
