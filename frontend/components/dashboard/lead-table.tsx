"use client";

import { Lead } from "@/lib/types";
import { timeAgo, channelLabel } from "@/lib/utils";
import { LeadStatusBadge } from "./lead-status-badge";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface LeadTableProps {
  leads: Lead[];
}

export function LeadTable({ leads }: LeadTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-warm-100 text-xs font-semibold uppercase tracking-wider text-stone-600">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Intent</th>
              <th className="px-4 py-3">Preferred area</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned to</th>
              <th className="px-4 py-3">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => router.push(`/leads/${lead.id}`)}
                className="cursor-pointer transition hover:bg-warm-50"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-stone-900">{lead.name}</p>
                    <p className="text-xs text-stone-500">{lead.phoneMasked}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-700">
                  <Badge variant="soft" className="text-[10px]">{channelLabel(lead.channel)}</Badge>
                </td>
                <td className="px-4 py-3 text-stone-700 capitalize">{lead.intent}</td>
                <td className="px-4 py-3 text-stone-700">{lead.location || "—"}</td>
                <td className="px-4 py-3 text-stone-700">{lead.budget || "—"}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-stone-900">{lead.score}</span>
                  <span className="ml-1 text-xs text-stone-500">/100</span>
                </td>
                <td className="px-4 py-3">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-stone-700">{lead.assignedAgent || "—"}</td>
                <td className="px-4 py-3 text-stone-500">
                  {timeAgo(lead.lastActivity)}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-stone-500">
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
