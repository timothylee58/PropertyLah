"use client";

import { Lead, LeadStatus } from "@/lib/types";
import { cn, scoreLabel } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const columns: { key: LeadStatus; label: string; color: string }[] = [
  { key: "new", label: "New", color: "border-t-4 border-t-sky-500" },
  { key: "qualified", label: "Qualified", color: "border-t-4 border-t-violet-500" },
  { key: "booked", label: "Booked", color: "border-t-4 border-t-emerald-500" },
  { key: "nurture", label: "Nurture", color: "border-t-4 border-t-stone-300" },
];

export function PipelineBoard({ leads }: { leads: Lead[] }) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((col) => {
        const columnLeads = leads.filter((l) => l.status === col.key);
        return (
          <div key={col.key} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-stone-700">{col.label}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-stone-600 shadow-sm">
                {columnLeads.length}
              </span>
            </div>
            <div className="flex min-h-[120px] flex-col gap-2 rounded-2xl border border-stone-200 bg-warm-50/50 p-3">
              {columnLeads.map((lead) => (
                <Card
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className={cn(
                    "cursor-pointer border-stone-200 transition hover:-translate-y-0.5 hover:shadow-md",
                    col.color
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{lead.name}</p>
                        <p className="text-xs text-stone-500">
                          {lead.intent} · {lead.location || "Area TBD"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          lead.score >= 80 ? "text-emerald-700" : "text-stone-500"
                        )}
                      >
                        {lead.score}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-stone-500">
                      {scoreLabel(lead.score).label}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {columnLeads.length === 0 && (
                <div className="flex flex-1 items-center justify-center text-xs text-stone-400">
                  No {col.label.toLowerCase()} leads
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
