import { Qualification } from "@/lib/types";

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

export function scoreLabel(score: number): "Hot" | "Warm" | "Nurture" | "Unqualified" {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Warm";
  if (score >= 30) return "Nurture";
  return "Unqualified";
}
