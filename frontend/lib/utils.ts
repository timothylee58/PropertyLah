import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LeadStatus, Qualification } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount?: number): string {
  if (amount == null) return "—";
  if (amount < 10000) return `RM${amount.toLocaleString()}`;
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

export function calculateLeadScore(q: Qualification): number {
  let score = 0;
  if (q.financing) score += 25;
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
  return { label: "Nurture", colorClass: "bg-slate-100 text-slate-600" };
}

export function statusColor(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "bg-sky-100 text-sky-700";
    case "qualified":
      return "bg-violet-100 text-violet-700";
    case "booked":
      return "bg-emerald-100 text-emerald-700";
    case "cold":
      return "bg-stone-200 text-stone-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function statusLabel(status: LeadStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function classNames(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
