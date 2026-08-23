"use client";

import { Lead } from "@/lib/types";
import { cn, formatCurrency, scoreLabel, statusColor, statusLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MapPin, Home, Bed, Banknote, Calendar, CircleCheck } from "lucide-react";

interface LeadProfileProps {
  lead: Lead;
}

export function LeadProfile({ lead }: LeadProfileProps) {
  const { label, colorClass } = scoreLabel(lead.score);
  const q = lead.qualification;

  const details = [
    { key: "Budget", value: q.budgetMax ? formatCurrency(q.budgetMax) : undefined, icon: Banknote },
    { key: "Location", value: q.location, icon: MapPin },
    { key: "Property type", value: q.propertyType, icon: Home },
    { key: "Bedrooms", value: q.bedrooms ? `${q.bedrooms} BR` : undefined, icon: Bed },
    { key: "Financing", value: q.financing === undefined ? undefined : q.financing ? "Pre-approved" : "Not yet", icon: CircleCheck },
  ];

  const collected = details.filter((d) => d.value != null).length;
  const progress = Math.min(100, (collected / details.length) * 100);

  return (
    <Card className="h-auto">
      <CardHeader className="border-b border-stone-100 pb-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">Live Lead Profile</h2>
          <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
            Malaysia · EN / BM
          </Badge>
        </div>
        <p className="text-sm font-semibold text-stone-800">{lead.name || "Guest lead"}</p>
        <p className="text-xs text-stone-500">{lead.source || "Live chat session"}</p>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full border-4 bg-white text-lg font-bold shadow-sm",
              lead.score >= 80 ? "border-emerald-500 text-emerald-700" : "border-amber-400 text-amber-700"
            )}
          >
            {lead.score}
          </div>
          <div>
            <p className="text-lg font-semibold text-stone-900">
              {lead.score} {label} Lead
            </p>
            <p className="text-xs text-stone-500">
              Updated in real time as details are collected.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={cn(statusColor(lead.status))}>{statusLabel(lead.status)}</Badge>
          {lead.qualification.viewingSelected && (
            <Badge variant="default" className="bg-emerald-700">Viewing scheduled</Badge>
          )}
          {process.env.NEXT_PUBLIC_DEMO_MODE !== "false" && (
            <Badge variant="soft" className="text-[10px]">Demo data</Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>Qualification progress</span>
            <span className="font-medium">{collected}/{details.length} details collected</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-teal-700 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Qualification details
          </h3>
          <div className="grid gap-2">
            {details.map((detail) => {
              const Icon = detail.icon;
              return (
                <div
                  key={detail.key}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-sm",
                    detail.value
                      ? "border-stone-200 bg-white text-stone-800"
                      : "border-dashed border-stone-200 bg-warm-50 text-stone-400"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{detail.key}</span>
                  </div>
                  <span className="text-xs">{detail.value || "—"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {lead.qualification.timelineDays != null && (
          <div className="rounded-xl border border-stone-200 bg-warm-50 p-3">
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium">Move-in timeline</span>
            </div>
            <p className="mt-1 text-sm text-stone-800">Within {lead.qualification.timelineDays} days</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
