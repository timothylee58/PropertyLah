const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Lead = {
  id: string;
  caller_name?: string;
  caller_phone?: string;
  lead_type: string;
  budget_range?: string;
  preferred_area?: string;
  qualification_score?: number;
  status: string;
  created_at: string;
};

export async function getLeads(): Promise<Lead[]> {
  const res = await fetch(`${API_URL}/leads`, { cache: "no-store" });
  return res.json();
}

export async function getLead(id: string) {
  const res = await fetch(`${API_URL}/leads/${id}`, { cache: "no-store" });
  return res.json();
}
