"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead } from "@/lib/types";
import { getLeads } from "@/lib/api";
import { MetricCard } from "@/components/dashboard/metric-card";
import { LeadTable } from "@/components/dashboard/lead-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Target, CalendarCheck, Flame } from "lucide-react";

const statusFilters: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "qualified", label: "Qualified" },
  { key: "booked", label: "Booked" },
  { key: "nurture", label: "Nurture" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    getLeads().then(setLeads);
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || (l.location || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "all" || l.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [leads, search, status]);

  const metrics = {
    all: leads.length,
    hot: leads.filter((l) => l.score >= 80).length,
    awaiting: leads.filter((l) => l.conversationStatus === "ai_handling" && l.status !== "booked").length,
    booked: leads.filter((l) => l.status === "booked").length,
  };

  return (
    <div className="min-h-full bg-warm-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Leads</h1>
            <p className="text-sm text-stone-500">Every WhatsApp conversation becomes structured, actionable lead data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft" className="text-[10px] font-medium uppercase tracking-wide">Demo data</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="All Leads" value={metrics.all} icon={Users} tone="teal" />
          <MetricCard title="Hot" value={metrics.hot} icon={Flame} tone="emerald" />
          <MetricCard title="Awaiting Reply" value={metrics.awaiting} icon={Target} tone="amber" />
          <MetricCard title="Booked" value={metrics.booked} icon={CalendarCheck} tone="violet" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name or area…"
            className="max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`
                  rounded-full px-3 py-1.5 text-xs font-medium transition
                  ${status === f.key ? "bg-stone-800 text-white" : "bg-white text-stone-600 hover:bg-stone-100"}
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <LeadTable leads={filtered} />
      </div>
    </div>
  );
}
