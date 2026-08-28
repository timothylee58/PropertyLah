"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Inter } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMarketing = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <html lang="en" className={cn(inter.variable, "scroll-smooth")}>
      <body className="min-h-screen bg-warm-50 font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('propertylah-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}",
          }}
        />
        {isMarketing ? (
          <>{children}</>
        ) : (
          <>
            <div className="hidden md:flex">
              <AppSidebar
                className="fixed left-0 top-0"
                collapsed={collapsed}
                onToggle={setCollapsed}
              />
            </div>

            <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4 md:hidden">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-white">
                  <span className="text-xs font-bold">PL</span>
                </div>
                <span className="font-semibold text-stone-900">PropertyLah AI</span>
              </div>
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </header>

            <main
              className={cn(
                "h-screen overflow-hidden pt-14 transition-all duration-300 md:pt-0",
                collapsed ? "md:ml-16" : "md:ml-60"
              )}
            >
              <div className="h-full overflow-auto">{children}</div>
            </main>

            <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} side="left">
              <AppSidebar className="w-60 border-0" />
            </Sheet>
          </>
        )}
      </body>
    </html>
  );
}
