"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Calendar,
  Users,
  CheckCircle,
  Menu,
  X,
  ArrowRight,
  Star,
  Bot,
  Inbox,
  ChevronRight,
  MessageSquare,
  Phone,
  FileText,
  Search,
  TrendingUp,
  Zap,
  BadgeCheck,
} from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const stats = [
  { value: "24/7", label: "AI concierge online" },
  { value: "< 2 min", label: "setup time" },
  { value: "< 30s", label: "first response" },
  { value: "4.9/5", label: "agent satisfaction" },
];

const useCases = [
  {
    icon: Bot,
    title: "AI Qualification",
    description:
      "Ask budget, timeline, location and financing in Bahasa Malaysia or English. Every lead is scored automatically.",
  },
  {
    icon: Search,
    title: "Smart Listing Match",
    description:
      "Match prospects to approved listings by price, location, bedrooms and facilities — with source citations.",
  },
  {
    icon: Calendar,
    title: "Viewing Bookings",
    description:
      "Offer available slots, confirm bookings, and update your calendar without lifting a finger.",
  },
  {
    icon: Inbox,
    title: "Unified Inbox",
    description:
      "Every WhatsApp, Telegram and web lead in one inbox. See who needs a reply and what each deal is worth.",
  },
];

const chatMessages = [
  { side: "right", text: "Hi, looking for 3-bedroom condo in KL. Budget around RM 600k." },
  { side: "left", text: "Hi! Great. A few quick questions: when do you plan to move, and is your financing ready?", name: "Aisha" },
  { side: "right", text: "Move in 3 months, loan approved." },
  { side: "left", text: "Found 2 listings that match. Both near KLCC, 3 beds, below RM 600k. Want to view this Saturday?", name: "Aisha" },
  { side: "right", text: "Yes, 2pm works." },
  { side: "left", text: "Booked! Saturday 2pm at Residensi Harmoni. I’ll send the viewing details now. ✓", name: "Aisha" },
];

const steps = [
  {
    step: "01",
    title: "Connect your channels",
    description: "Link WhatsApp, Telegram, or add a web chat widget. No code required.",
  },
  {
    step: "02",
    title: "Upload your inventory",
    description: "Add listings, price lists, FAQs and agency rules. The AI only answers from your sources.",
  },
  {
    step: "03",
    title: "Watch it book viewings",
    description: "The AI qualifies, matches, schedules, and updates your CRM — while you focus on closing.",
  },
];

const pricing = [
  {
    name: "Starter",
    tag: "For solo agents",
    price: "RM 49",
    period: "/month",
    description: "Everything you need to qualify and book leads on WhatsApp.",
    features: [
      "1 WhatsApp number",
      "500 AI replies/month",
      "1,000 leads",
      "Basic listing matching",
      "Viewing booking",
      "Unified inbox",
    ],
    cta: "Start free trial",
    popular: false,
  },
  {
    name: "Pro",
    tag: "Most popular · for serious agents",
    price: "RM 99",
    period: "/month",
    description: "Full AI concierge with scheduling, knowledge base and analytics.",
    features: [
      "3 WhatsApp numbers",
      "10,000 AI replies/month",
      "Unlimited leads",
      "Advanced listing match with rules",
      "Knowledge base uploads",
      "Open-rate and reply analytics",
      "REST API and webhooks",
    ],
    cta: "Start free trial",
    popular: true,
  },
  {
    name: "Agency",
    tag: "For teams and agencies",
    price: "RM 249",
    period: "/month",
    description: "Multi-agent, white-glove onboarding and dedicated support.",
    features: [
      "10 WhatsApp numbers",
      "Unlimited AI replies",
      "Unlimited leads and listings",
      "Team inbox and handoff rules",
      "Priority support",
      "Custom integrations",
      "Dedicated onboarding",
    ],
    cta: "Talk to sales",
    popular: false,
  },
];

const testimonials = [
  {
    quote:
      "Saya tak pernah miss lead lagi. PropertyLah reply dalam masa 30 saat, qualify dulu, baru saya ambil alih untuk viewing.",
    name: "Ahmad Faris",
    role: "Property Agent · KL",
    initials: "AF",
  },
  {
    quote:
      "Sebelum ni kena jawab WhatsApp sampai lewat malam. Sekarang AI urus enquiry, saya fokus closing saja.",
    name: "Siti Noraini",
    role: "Agency Owner · Shah Alam",
    initials: "SN",
  },
  {
    quote:
      "Setup dalam 2 minit. Lead datang, AI tanya soalan, match listing, book viewing — semua auto. Berbaloi.",
    name: "Khairul Annuar",
    role: "Freelance Agent · Johor",
    initials: "KA",
  },
  {
    quote:
      "Our team handles 5x more viewings since we switched. The handoff to human agents is seamless.",
    name: "Michelle Tan",
    role: "Team Lead · Penang",
    initials: "MT",
  },
  {
    quote:
      "Knowledge base means the AI quotes our actual listings and policies. No more wrong info to clients.",
    name: "Rajesh Kumar",
    role: "Broker · Petaling Jaya",
    initials: "RK",
  },
  {
    quote:
      "Pelanggan BM pun faham. AI reply macam manusia, boleh rojak. My clients love the fast response.",
    name: "Nurul Huda",
    role: "Property Negotiator · Kajang",
    initials: "NH",
  },
];

const footerLinks = [
  { title: "Product", links: ["Features", "Pricing", "WhatsApp AI", "CRM", "Calendar"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { title: "Resources", links: ["Docs", "API Reference", "Help Center", "Status"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security"] },
];

/** 24-ray radial mark, matching the PropertyLah brand logo geometry. */
function Mark({ className }: { className?: string }) {
  const cx = 26;
  const cy = 26;
  const inner = 10.4;
  const outer = 22.6;
  const count = 24;
  const rays = Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
    return {
      x1: cx + Math.cos(angle) * inner,
      y1: cy + Math.sin(angle) * inner,
      x2: cx + Math.cos(angle) * outer,
      y2: cy + Math.sin(angle) * outer,
    };
  });

  return (
    <svg viewBox="0 0 52 52" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="var(--mark-stroke)" strokeWidth="1.4" strokeLinecap="round">
        {rays.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r="7.4" fill="var(--mark-fill)" />
    </svg>
  );
}

function fadeStyle(delayMs: number): React.CSSProperties {
  return { animationDelay: `${delayMs}ms` };
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const goToDashboard = () => router.push("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--heading)] antialiased">
      {/* Navigation */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--hairline)] bg-[var(--bg-translucent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Mark className="h-8 w-8" />
            <span className="text-lg font-semibold text-[var(--heading)]">PropertyLah</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[var(--nav)] transition hover:text-[var(--nav-hover)]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[var(--nav)] transition hover:text-[var(--nav-hover)]"
            >
              Log in
            </Link>
            <button
              onClick={goToDashboard}
              className="rounded-full bg-[var(--btn-bg)] px-4 py-2 text-sm font-medium text-[var(--btn-fg)] transition hover:bg-[var(--btn-bg-hover)] active:scale-[.98]"
            >
              Get Started
            </button>
            <ThemeToggle className="rounded-lg p-2 text-[var(--nav)] transition hover:bg-[var(--chip-fill)] hover:text-[var(--nav-hover)]" />
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle className="rounded-lg p-2 text-[var(--nav)] hover:bg-[var(--chip-fill)]" />
            <button
              className="rounded-lg p-2 text-[var(--nav)] hover:bg-[var(--chip-fill)]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[var(--hairline)] bg-[var(--bg)] px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-[var(--nav)]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-[var(--hairline)]" />
              <Link
                href="/dashboard"
                className="text-sm font-medium text-[var(--nav)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-[var(--btn-bg)] px-4 py-2 text-sm font-medium text-[var(--btn-fg)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div
            className="fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--chip-fill)] px-3 py-1.5 text-xs font-medium text-[var(--nav)]"
            style={fadeStyle(0)}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Malaysia&apos;s WhatsApp-first property agent AI
          </div>

          <h1
            className="fade-up text-5xl font-medium leading-[1.04] tracking-tight text-[var(--heading)] sm:text-6xl lg:text-7xl"
            style={fadeStyle(80)}
          >
            PropertyLah,{" "}
            <span className="grad-text">your AI property agent</span>.
          </h1>

          <p
            className="fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--subtle)]"
            style={fadeStyle(220)}
          >
            An AI concierge that qualifies prospects, matches listings, and schedules viewings
            — in Bahasa Malaysia or English, 24/7.
          </p>

          <div
            className="fade-up mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={fadeStyle(320)}
          >
            <button
              onClick={goToDashboard}
              className="inline-flex w-full items-center justify-center rounded-full bg-[var(--btn-bg)] px-6 py-3 text-base font-medium text-[var(--btn-fg)] transition hover:bg-[var(--btn-bg-hover)] active:scale-[.98] sm:w-auto"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <a
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--hairline-strong)] bg-[var(--chip-fill)] px-6 py-3 text-sm font-medium text-[var(--nav-hover)] transition hover:bg-[var(--chip-fill-hover)] sm:w-auto"
            >
              Watch demo
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <div
            className="fade-up mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-[var(--subtle)]"
            style={fadeStyle(400)}
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              Setup in &lt;2 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              4.9 · 500+ agents
            </span>
          </div>

          {/* Chat mock */}
          <div
            className="fade-up relative mx-auto mt-16 max-w-sm overflow-hidden rounded-[2.5rem] border border-[var(--hairline)] bg-[var(--card)] shadow-[0_2px_40px_rgba(0,0,0,0.45)]"
            style={fadeStyle(520)}
          >
            <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--avatar-bg)]">
                <Bot className="h-4 w-4 text-[var(--icon)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--heading)]">Aisha · PropertyLah AI</p>
                <p className="text-[10px] text-[var(--subtle)]">Online now</p>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn("flex", msg.side === "right" ? "justify-end" : "justify-start")}
                >
                  {msg.side === "left" && (
                    <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--avatar-bg)] text-[var(--icon)]">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.side === "right"
                        ? "rounded-br-sm bg-[var(--btn-bg)] text-[var(--btn-fg)]"
                        : "rounded-bl-sm bg-[var(--card-alt)] text-[var(--text)]"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--hairline)] px-4 py-3">
              <div className="flex items-center gap-2 rounded-full bg-[var(--chip-fill-hover)] px-4 py-2 text-sm text-[var(--placeholder)]">
                Type a message…
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[var(--hairline)] bg-[var(--bg-alt)] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-semibold text-[var(--heading)] sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-[var(--subtle)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--heading)] sm:text-4xl">
              The operating system for <span className="grad-text">property agents</span>.
            </h2>
            <p className="mt-4 text-[var(--subtle)]">
              Qualify, match, and book — all from the chat apps your leads already use.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 transition hover:border-[var(--hairline-strong)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--chip-fill-hover)] text-[var(--icon)]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[var(--heading)]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--subtle)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark platform section */}
      <section className="bg-[var(--bg-alt)] py-20 sm:py-28 text-[var(--heading)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-medium leading-tight sm:text-4xl">
                One dashboard for your <span className="grad-text">entire agency</span>.
              </h2>
              <p className="mt-4 text-[var(--subtle)]">
                Monitor every conversation, lead, and viewing from a single command center. Take over when the AI needs a human touch.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  "Unified inbox for all channels",
                  "Hot lead scoring and routing",
                  "Viewings calendar and reminders",
                  "Knowledge base and rule audit",
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm text-[var(--subtle)]">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    {point}
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <button
                  onClick={goToDashboard}
                  className="inline-flex items-center justify-center rounded-full bg-[var(--btn-bg)] px-6 py-3 text-base font-medium text-[var(--btn-fg)] transition hover:bg-[var(--btn-bg-hover)] active:scale-[.98]"
                >
                  Open Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--avatar-bg)] text-[var(--icon)]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--heading)]">Command Center</p>
                  <p className="text-xs text-[var(--subtle)]">Live pipeline</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "New WhatsApp Leads", value: "12", icon: Users },
                  { label: "Qualified Leads", value: "8", icon: BadgeCheck },
                  { label: "Viewings Booked", value: "5", icon: Calendar },
                  { label: "Hot Leads", value: "3", icon: Zap },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-2xl bg-[var(--tile)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--chip-fill-hover)] text-[var(--icon)]">
                        <row.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-[var(--subtle)]">{row.label}</span>
                    </div>
                    <span className="text-lg font-semibold text-[var(--heading)]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-[var(--bg)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--heading)] sm:text-4xl">
              Up and running in <span className="grad-text">minutes</span>.
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.step} className="rounded-3xl border border-[var(--hairline)] bg-[var(--card)] p-6 text-center">
                <span className="text-4xl font-semibold text-[var(--step-num)]">{step.step}</span>
                <h3 className="mt-4 text-lg font-semibold text-[var(--heading)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--subtle)]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[var(--bg-alt)] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--heading)] sm:text-4xl">
              Simple, transparent, <span className="grad-text">actually affordable</span>.
            </h2>
            <p className="mt-4 text-[var(--subtle)]">
              Pick a plan. Cancel anytime. No setup fees, no hidden costs.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-6 sm:p-8",
                  plan.popular
                    ? "border-[var(--popular-border)] bg-[var(--tile)]"
                    : "border-[var(--hairline)] bg-[var(--card)]"
                )}
              >
                {plan.popular && (
                  <span className="grad-bar absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold text-[#0c0c0c]">
                    Most popular
                  </span>
                )}
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--subtle)]">
                  {plan.tag}
                </span>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--heading)]">{plan.name}</h3>
                <p className="mt-4 text-sm text-[var(--subtle)]">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-[var(--heading)]">{plan.price}</span>
                  <span className="text-sm text-[var(--subtle)]">{plan.period}</span>
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-[var(--text)]">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={goToDashboard}
                  className={cn(
                    "mt-8 w-full rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[.98]",
                    plan.popular
                      ? "bg-[var(--btn-bg)] text-[var(--btn-fg)] hover:bg-[var(--btn-bg-hover)]"
                      : "border border-[var(--hairline-strong)] bg-transparent text-[var(--nav-hover)] hover:bg-[var(--chip-fill-hover)]"
                  )}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-28 bg-[var(--bg)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-medium tracking-tight text-[var(--heading)] sm:text-4xl">
              What our <span className="grad-text">agents</span> say.
            </h2>
            <p className="mt-4 text-[var(--subtle)]">
              Malaysian agents and agencies using PropertyLah every day.
            </p>
          </div>

          <div className="mt-14 columns-1 gap-6 sm:columns-2 lg:columns-3">
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="mb-6 break-inside-avoid rounded-2xl border border-[var(--hairline)] bg-[var(--card)] p-6"
              >
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[var(--text)]">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--avatar-bg)] text-xs font-semibold text-[var(--nav-hover)]">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--heading)]">{item.name}</p>
                    <p className="text-xs text-[var(--subtle)]">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[var(--bg-alt)] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-medium tracking-tight text-[var(--heading)] sm:text-4xl">
            Ready to stop missing leads?
          </h2>
          <p className="mt-4 text-[var(--subtle)]">
            Start your free trial. No credit card required. Cancel anytime.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={goToDashboard}
              className="inline-flex w-full items-center justify-center rounded-full bg-[var(--btn-bg)] px-8 py-3 text-base font-medium text-[var(--btn-fg)] transition hover:bg-[var(--btn-bg-hover)] active:scale-[.98] sm:w-auto"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <a
              href="mailto:hello@propertylah.ai"
              className="inline-flex w-full items-center justify-center rounded-full border border-[var(--hairline-strong)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--nav-hover)] transition hover:bg-[var(--chip-fill-hover)] sm:w-auto"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--hairline)] bg-[var(--bg-deep)] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <Mark className="h-8 w-8" />
                <span className="text-lg font-semibold text-[var(--heading)]">PropertyLah</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--subtle)]">
                The WhatsApp-first AI concierge that qualifies property leads and books viewings
                while you sleep.
              </p>
            </div>
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h4 className="text-sm font-semibold text-[var(--heading)]">{group.title}</h4>
                <ul className="mt-4 space-y-2">
                  {group.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-[var(--subtle)] transition hover:text-[var(--nav-hover)]"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--hairline)] pt-8 sm:flex-row">
            <p className="text-xs text-[var(--faint)]">
              © {new Date().getFullYear()} PropertyLah. Built for Malaysian property agents.
            </p>
            <div className="flex items-center gap-4">
              <MessageSquare className="h-4 w-4 text-[var(--faint)]" />
              <Phone className="h-4 w-4 text-[var(--faint)]" />
              <FileText className="h-4 w-4 text-[var(--faint)]" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
