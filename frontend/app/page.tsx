import { getLeads } from "@/lib/api";
import Link from "next/link";

const statusColor: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  qualified: "bg-emerald-100 text-emerald-700",
  appointment_booked: "bg-blue-100 text-blue-700",
  disqualified: "bg-red-100 text-red-700",
  scam_flagged: "bg-amber-100 text-amber-800",
};

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Lead Pipeline</h1>
      <div className="space-y-2">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`/calls/${lead.id}`}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition"
          >
            <div>
              <p className="font-medium">{lead.caller_name || lead.caller_phone || "Unknown caller"}</p>
              <p className="text-sm text-slate-500">
                {lead.lead_type} · {lead.preferred_area || "area TBD"} · {lead.budget_range || "budget TBD"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lead.qualification_score != null && (
                <span className="text-sm text-slate-500">{lead.qualification_score}/100</span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${statusColor[lead.status] || ""}`}>
                {lead.status}
              </span>
            </div>
          </Link>
        ))}
        {leads.length === 0 && (
          <p className="text-slate-400 text-sm">No leads yet — run a test call to populate this.</p>
        )}
      </div>
    </main>
  );
}
