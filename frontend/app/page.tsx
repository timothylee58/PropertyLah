"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lead } from "@/lib/types";
import { OverviewData, getOverview, IS_DEMO } from "@/lib/api";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { ActivityFeed } from "@/components/overview/activity-feed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Users, Target, CalendarCheck, Flame, Clock, ArrowRight, Lightbulb } from "lucide-react";

export default function OverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    getOverview().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-stone-500">
        Loading overview…
      </div>
    );
  }

  const attention = data.leads
    .filter((l) => l.status === "booked" || l.status === "qualified" || l.status === "new")
    .slice(0, 3);

  return (
    <div className="min-h-full bg-warm-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Good afternoon, KeyNest Team</h1>
            <p className="text-sm text-stone-500">Your WhatsApp property concierge is qualifying leads and booking viewings.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={IS_DEMO ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
              <span className={cn("mr-1 inline-block h-1.5 w-1.5 rounded-full", IS_DEMO ? "bg-amber-500" : "bg-emerald-500")}></span>
              {IS_DEMO ? "WhatsApp Demo" : "WhatsApp Connected"}
            </Badge>
            <Button onClick={() => router.push("/inbox")}>
              Open Inbox
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="New WhatsApp Leads" value={data.newLeads} icon={Users} tone="teal" />
          <MetricCard title="Qualified Leads" value={data.qualifiedLeads} icon={Target} tone="violet" />
          <MetricCard title="Viewings Booked" value={data.bookedViewings} icon={CalendarCheck} tone="emerald" />
          <MetricCard title="Hot Leads" value={data.hotLeads} icon={Flame} tone="amber" />
          <MetricCard title="Median First Response" value={data.medianFirstResponse} icon={Clock} tone="teal" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ActivityFeed activities={data.activities} />
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Lead Pipeline</h2>
              <PipelineBoard leads={data.leads} />
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-stone-900">Attention Needed</h2>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-stone-100 p-0">
                {attention.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => router.push(`/inbox`)}
                    className="w-full px-5 py-3 text-left transition hover:bg-stone-50"
                  >
                    <p className="text-sm font-medium text-stone-900">{lead.name}</p>
                    <p className="text-xs text-stone-500">{lead.nextBestAction}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-stone-100 pb-4">
                <h2 className="text-sm font-semibold text-stone-900">Recent Bookings</h2>
              </CardHeader>
              <CardContent className="divide-y divide-stone-100 p-0">
                {data.viewings.slice(0, 3).map((v) => (
                  <button
                    key={v.bookingId}
                    onClick={() => router.push(`/viewings`)}
                    className="w-full px-5 py-3 text-left transition hover:bg-stone-50"
                  >
                    <p className="text-sm font-medium text-stone-900">{v.listing?.name || v.propertyReference || "Property to be confirmed"}</p>
                    <p className="text-xs text-stone-500">{v.slot.label} · {v.confirmed ? "Confirmed" : "Pending"}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
