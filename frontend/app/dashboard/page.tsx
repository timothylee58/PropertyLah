"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lead } from "@/lib/types";
import { getLeads } from "@/lib/api";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineBoard } from "@/components/dashboard/pipeline-board";
import { LeadTable } from "@/components/dashboard/lead-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Target, CalendarCheck, Flame, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getLeads().then((data) => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-full bg-warm-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-stone-900">Lead Dashboard</h1>
              <Badge variant="soft" className="text-[10px] font-medium uppercase tracking-wide">
                Demo data
              </Badge>
            </div>
            <p className="text-sm text-stone-500">
              See which conversations are ready for your next move.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="w-fit">
            Open Agent Inbox
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="New Leads" value={12} icon={Users} tone="teal" />
          <MetricCard title="Qualified" value={8} icon={Target} tone="violet" />
          <MetricCard title="Viewings Booked" value={4} icon={CalendarCheck} tone="emerald" />
          <MetricCard title="Hot Leads" value={3} icon={Flame} tone="amber" />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            Pipeline
          </h2>
          <PipelineBoard leads={leads} />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            All leads
          </h2>
          {loading ? (
            <div className="h-40 rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
              Loading leads…
            </div>
          ) : (
            <LeadTable leads={leads} />
          )}
        </div>
      </div>
    </div>
  );
}
