"use client";

import { Lead } from "@/lib/types";
import { cn, formatCurrency, scoreLabel, statusColor, statusLabel, conversationStatusColor, conversationStatusLabel, callStatusColor, callStatusLabel, getInitials } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Sparkles } from "lucide-react";

export function LeadDetailPanel({ lead }: { lead: Lead }) {
  const q = lead.qualification;
  const { label } = scoreLabel(lead.score);

  const checklist = [
    { label: "Budget", value: lead.budgetLabel || (q.budgetMax ? formatCurrency(q.budgetMax) : undefined) },
    { label: "Location", value: lead.location || q.location },
    { label: "Property type", value: q.propertyType },
    { label: "Bedrooms", value: q.bedrooms != null ? `${q.bedrooms} BR` : undefined },
    { label: "Financing", value: lead.financing ? (lead.financing === "approved" ? "Pre-approved" : lead.financing) : undefined },
    { label: "Timeline", value: lead.timeline || q.timeline },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-sm font-bold text-stone-700">
              {getInitials(lead.name)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-stone-900">{lead.name}</p>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Phone className="h-3 w-3" />
                <span>{lead.phoneMasked}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className={statusColor(lead.status)}>{statusLabel(lead.status)}</Badge>
            <Badge className={conversationStatusColor(lead.conversationStatus)}>{conversationStatusLabel(lead.conversationStatus)}</Badge>
            {lead.callStatus !== "not_requested" && (
              <Badge className={callStatusColor(lead.callStatus)}>{callStatusLabel(lead.callStatus)}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-stone-900">AI Summary</h2>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <p className="text-sm leading-relaxed text-stone-700">{lead.aiSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-sm font-semibold text-stone-900">Qualification</h2>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {checklist.map((item) => (
              <div key={item.label}>
                <p className="text-xs text-stone-500">{item.label}</p>
                <p className={cn("font-medium", item.value ? "text-stone-800" : "text-stone-300")}>
                  {item.value || "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-warm-50 p-4">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full border-4 bg-white text-lg font-bold",
                lead.score >= 80 ? "border-emerald-500 text-emerald-700" : "border-amber-400 text-amber-700"
              )}
            >
              {lead.score}
            </div>
            <div>
              <p className="font-semibold text-stone-900">
                {lead.score} / 100 · {label}
              </p>
              <p className="text-xs text-stone-500">Lead score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-stone-100 pb-4">
          <h2 className="text-sm font-semibold text-stone-900">Next best action</h2>
        </CardHeader>
        <CardContent className="pt-5">
          <p className="text-sm leading-relaxed text-stone-700">{lead.nextBestAction}</p>
        </CardContent>
      </Card>

      {lead.assignedAgent && (
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4">
          <User className="h-4 w-4 text-stone-500" />
          <span className="text-sm text-stone-600">Assigned to</span>
          <span className="text-sm font-medium text-stone-900">{lead.assignedAgent}</span>
        </div>
      )}
    </div>
  );
}
