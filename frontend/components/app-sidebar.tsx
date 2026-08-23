"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, LayoutDashboard, Sparkles } from "lucide-react";

const nav = [
  { href: "/", label: "Agent Inbox", icon: Home },
  { href: "/dashboard", label: "Lead Dashboard", icon: LayoutDashboard },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen w-60 flex-col border-r border-stone-200 bg-white px-5 py-6",
        className
      )}
    >
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-stone-900">
              KeyNest AI
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
              Property Agent OS
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-teal-50 text-teal-800"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-warm-50 p-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-stone-700">AI Agent Online</span>
          </div>
          <p className="mt-1 text-[10px] text-stone-500">
            Qualifying leads 24/7 in English & BM.
          </p>
        </div>

        <div className="text-[10px] leading-relaxed text-stone-400">
          Powered by Hermes + Qwen
        </div>
      </div>
    </aside>
  );
}
