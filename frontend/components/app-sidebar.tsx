"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { IS_DEMO } from "@/lib/api";
import { LayoutDashboard, MessageSquare, Users, Calendar, BookOpen, Settings, Sparkles, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/viewings", label: "Viewings", icon: Calendar },
  { href: "/knowledge", label: "Knowledge & Rules", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

const STORAGE_KEY = "keynest-sidebar-collapsed";

interface AppSidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export function AppSidebar({ className, collapsed: controlled, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlled ?? internalCollapsed;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setInternalCollapsed(saved === "true");
    } catch {
      // ignore
    }
  }, []);

  const setCollapsed = (next: boolean) => {
    if (controlled === undefined) {
      setInternalCollapsed(next);
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
    }
    onToggle?.(next);
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-stone-200 bg-white px-3 py-6 transition-all duration-300",
        isCollapsed ? "w-16" : "w-60",
        className
      )}
    >
      <button
        onClick={() => setCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:bg-stone-50 hover:text-stone-900"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className={cn("mb-8 flex items-center gap-2", isCollapsed && "justify-center")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        {!isCollapsed && (
          <div>
            <h1 className="text-base font-semibold leading-tight text-stone-900">PropertyLah AI</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500">Property Agent OS</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isCollapsed ? "justify-center px-2" : "",
                isActive
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-4", isCollapsed && "hidden")}>
        <div className="rounded-2xl border border-stone-200 bg-warm-50 p-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-stone-700">AI Agent Online</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-stone-500">
            <CheckCircle className="h-3 w-3 text-emerald-600" />
            {IS_DEMO ? "WhatsApp Demo Connected" : "WhatsApp Connected"}
          </div>
        </div>

        <div className="text-[10px] leading-relaxed text-stone-400">Powered by Hermes + Qwen</div>
      </div>
    </aside>
  );
}
