import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LeadStatus, Qualification, ConversationStatus, CallStatus, Channel } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount?: number): string {
  if (amount == null) return "—";
  return `RM${amount.toLocaleString()}`;
}

export function formatRent(amount?: number): string {
  if (amount == null) return "—";
  return `RM${amount.toLocaleString()}/month`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function calculateLeadScore(q: Qualification): number {
  let score = 0;
  if (q.financing === "approved") score += 25;
  if (q.budgetMax && q.budgetMax >= 300000 && q.budgetMax <= 3000000) score += 20;
  if (q.timelineDays != null && q.timelineDays <= 60) score += 20;
  if (q.location && q.location.trim().length > 0) score += 15;
  if (q.propertyType && q.bedrooms != null) score += 5;
  if (q.viewingSelected) score += 20;
  return Math.min(100, score);
}

export function scoreLabel(score: number): { label: "Hot" | "Warm" | "Nurture"; colorClass: string } {
  if (score >= 80) return { label: "Hot", colorClass: "bg-emerald-100 text-emerald-700" };
  if (score >= 60) return { label: "Warm", colorClass: "bg-amber-100 text-amber-700" };
  return { label: "Nurture", colorClass: "bg-stone-100 text-stone-600" };
}

export function statusColor(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "bg-sky-100 text-sky-700";
    case "qualified":
      return "bg-violet-100 text-violet-700";
    case "booked":
      return "bg-emerald-100 text-emerald-700";
    case "nurture":
      return "bg-stone-200 text-stone-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function statusLabel(status: LeadStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function conversationStatusColor(status: ConversationStatus): string {
  switch (status) {
    case "ai_handling":
      return "bg-emerald-100 text-emerald-700";
    case "human_handling":
      return "bg-violet-100 text-violet-700";
    case "closed":
      return "bg-stone-100 text-stone-500";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function conversationStatusLabel(status: ConversationStatus): string {
  switch (status) {
    case "ai_handling":
      return "AI handling";
    case "human_handling":
      return "Human handling";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function callStatusColor(status: CallStatus): string {
  switch (status) {
    case "not_requested":
      return "bg-stone-100 text-stone-500";
    case "requested":
      return "bg-amber-100 text-amber-700";
    case "scheduled":
      return "bg-sky-100 text-sky-700";
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function callStatusLabel(status: CallStatus): string {
  switch (status) {
    case "not_requested":
      return "No call";
    case "requested":
      return "Call requested";
    case "scheduled":
      return "Call scheduled";
    case "completed":
      return "Call completed";
    default:
      return status;
  }
}

export function channelLabel(channel: Channel): string {
  switch (channel) {
    case "whatsapp":
      return "WhatsApp";
    case "web":
      return "Web";
    case "telegram":
      return "Telegram";
    case "phone":
      return "Phone";
    default:
      return channel;
  }
}

export function formatPhone(phone?: string): string {
  if (!phone) return "—";
  if (phone.length > 4) return phone.slice(0, -4) + "****";
  return phone;
}

export function classNames(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
