"use client";

import { Lead } from "@/lib/types";
import { calculateLeadScore, cn, formatCurrency, formatDate, scoreLabel, statusColor, statusLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MapPin, Home, Bed, Banknote, Calendar, CircleCheck } from "lucide-react";

export function LeadDetailPanel({ lead }: { lead: Lead }) {
  const q = lead.qualification;
  const { label } = scoreLabel(lead.score);

  const checklist = [
    { label: "Budget set", met: q.budgetMax != null },
    { label: "Location known", met: q.location != null },
    { label: "Property type", met: q.propertyType != null },
    { label: "Bedrooms known", met: q.bedrooms != null },
    { label: "Financing status", met: q.financing != null },
    { label: "Move-in timeline", met: q.timelineDays != null },
  ];

  return (
    <Card>
      <CardHeader className="border-b border-stone-100 pb-4">
        <h2 className="text-sm font-semibold text-stone-900">Qualification</h2>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-stone-500">Budget</p>
            <p className="font-medium text-stone-800">{q.budgetMax ? formatCurrency(q.budgetMax) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Location</p>
            <p className="font-medium text-stone-800">{q.location || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Property type</p>
            <p className="font-medium text-stone-800">{q.propertyType || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Bedrooms</p>
            <p className="font-medium text-stone-800">{q.bedrooms != null ? `${q.bedrooms} BR` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Financing</p>
            <p className="font-medium text-stone-800">{q.financing != null ? (q.financing ? "Pre-approved" : "Not yet") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Timeline</p>
            <p className="font-medium text-stone-800">{q.timelineDays != null ? `Within ${q.timelineDays} days` : "—"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Qualification checklist
          </h3>
          <div className="grid gap-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <CheckCircle
                  className={cn(
                    "h-4 w-4",
                    item.met ? "text-emerald-600" : "text-stone-300"
                  )}
                />
                <span className={item.met ? "text-stone-800" : "text-stone-400"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-warm-50 p-4">
          <div className={cn("h-14 w-14 rounded-full border-4 bg-white flex items-center justify-center text-lg font-bold", lead.score >= 80 ? "border-emerald-500 text-emerald-700" : "border-amber-400 text-amber-700")}>
            {lead.score}
          </div>
          <div>
            <p className="font-semibold text-stone-900">
              {lead.score} / 100 · {label}
            </p>
            <p className="text-xs text-stone-500">Lead score</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={statusColor(lead.status)}>{statusLabel(lead.status)}</Badge>
          {lead.bookedViewing && (
            <Badge className="bg-emerald-700 text-white">Viewing booked</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
