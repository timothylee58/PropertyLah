import { getLead } from "@/lib/api";

export default async function CallDetailPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id);

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-xl font-semibold mb-4">{lead.caller_name || lead.caller_phone}</h1>
      <dl className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <dt className="text-slate-500">Type</dt>
          <dd>{lead.lead_type}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd>{lead.status}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Budget</dt>
          <dd>{lead.budget_range || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Area</dt>
          <dd>{lead.preferred_area || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Listing verified</dt>
          <dd>{lead.listing_verified === null ? "—" : lead.listing_verified ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Score</dt>
          <dd>{lead.qualification_score ?? "—"}/100</dd>
        </div>
        <div>
          <dt className="text-slate-500">Appointment</dt>
          <dd>
            {lead.appointment_at
              ? new Date(lead.appointment_at).toLocaleString("en-MY", {
                  timeZone: "Asia/Kuala_Lumpur",
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "—"}
          </dd>
        </div>
      </dl>
      {lead.notes && (
        <div className="border-t pt-4">
          <h2 className="font-medium mb-2">Notes</h2>
          <p className="text-sm text-slate-600">{lead.notes}</p>
        </div>
      )}
    </main>
  );
}
