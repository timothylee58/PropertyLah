"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Calendar,
  Users,
  CheckCircle,
  Menu,
  X,
  ArrowRight,
  Star,
  Bot,
  Inbox,
  Shield,
  ChevronRight,
  MessageSquare,
  Phone,
  FileText,
  Search,
  TrendingUp,
  Clock,
  MapPin,
  Home,
  BadgeCheck,
  Zap,
} from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
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

const deepFeatures = [
  {
    tag: "Qualify",
    title: "Stop losing leads to slow replies.",
    highlight: "Instant qualification",
    description:
      "Your AI concierge replies in seconds, asks the right questions, and scores every lead so you chase the hot ones first.",
    points: [
      "Budget, timeline and financing pre-qualified",
      "Bahasa Malaysia, English, or rojak — it understands",
      "Scores update in the CRM automatically",
    ],
    visual: "qualify",
  },
  {
    tag: "Match",
    title: "Find the right listing, every time.",
    highlight: "Source-cited matches",
    description:
      "Upload your inventory once. The agent quotes from your actual listings and knowledge sources, not the internet.",
    points: [
      "Matches budget, location, bedrooms and must-haves",
      "Cites the listing and agency rules behind every answer",
      "Learns from your price lists and FAQs",
    ],
    visual: "match",
  },
  {
    tag: "Book",
    title: "Book viewings while you sleep.",
    highlight: "Hands-free scheduling",
    description:
      "Offer available slots, confirm the appointment, and send calendar invites — all inside the WhatsApp thread.",
    points: [
      "Real-time slot availability",
      "Automatic calendar and CRM updates",
      "Reminders and follow-ups scheduled for you",
    ],
    visual: "book",
  },];

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

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const goToDashboard = () => router.push("/dashboard");

  return (
    <div className="min-h-screen bg-warm-50 font-sans text-stone-900">
      {/* Navigation */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-stone-200/80 bg-warm-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-stone-900">PropertyLah</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-stone-600 transition hover:text-stone-900"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-stone-600 transition hover:text-stone-900"
            >
              Log in
            </Link>
            <Button onClick={goToDashboard} className="rounded-full px-4 py-2 text-sm">
              Get Started
            </Button>
          </div>

          <button
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-stone-200 bg-warm-50 px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-stone-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-stone-200" />
              <Link
                href="/dashboard"
                className="text-sm font-medium text-stone-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white"
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Malaysia&apos;s WhatsApp-first property agent AI
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
                Turn your WhatsApp leads into{" "}
                <span className="bg-gradient-to-r from-teal-700 to-emerald-500 bg-clip-text font-serif italic text-transparent">
                  booked viewings
                </span>.
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-stone-600">
                An AI concierge that qualifies prospects, matches listings, and schedules viewings
                — in Bahasa Malaysia or English, 24/7.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  onClick={goToDashboard}
                  className="w-full rounded-full px-6 text-base sm:w-auto"
                >
                  Get Started Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <a
                  href="#how-it-works"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:w-auto"
                >
                  Watch demo
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-medium text-stone-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  Cancel anytime
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  Setup in &lt;2 minutes
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  4.9 · 500+ agents
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-100/50 blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl"></div>

              <div className="relative mx-auto max-w-sm overflow-hidden rounded-[2.5rem] border border-stone-200 bg-white shadow-2xl">
                <div className="bg-teal-700 px-5 py-4 text-white">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Aisha · PropertyLah AI</p>
                      <p className="text-[10px] text-teal-100">Online now</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 bg-stone-50 p-4">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn("flex", msg.side === "right" ? "justify-end" : "justify-start")}
                    >
                      {msg.side === "left" && (
                        <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          msg.side === "right"
                            ? "rounded-br-sm bg-teal-700 text-white"
                            : "rounded-bl-sm bg-white text-stone-700 shadow-sm"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-100 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-400">
                    Type a message…
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Social proof */}
      <section className="border-y border-stone-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-semibold text-stone-900 sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-stone-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              The operating system for{" "}
              <span className="font-serif italic text-teal-700">property agents</span>.
            </h2>
            <p className="mt-4 text-stone-600">
              Qualify, match, and book — all from the chat apps your leads already use.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-stone-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deep feature sections */}
      <section id="how-it-works" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Every feature built for <span className="font-serif italic text-teal-700">real selling</span>.
            </h2>
          </div>

          <div className="space-y-20">
            {deepFeatures.map((item, index) => (
              <div
                key={item.tag}
                className={cn(
                  "grid grid-cols-1 items-center gap-12 lg:grid-cols-2",
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                )}
              >
                <div className={cn("order-2", index % 2 === 1 ? "lg:order-1" : "lg:order-2")}>
                  <VisualCard visual={item.visual} />
                </div>
                <div className={cn("order-1", index % 2 === 1 ? "lg:order-2" : "lg:order-1")}>
                  <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                    {item.tag}
                  </span>
                  <h3 className="mt-4 text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">
                    {item.title} <span className="font-serif italic text-teal-700">{item.highlight}</span>.
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-stone-600">{item.description}</p>
                  <ul className="mt-6 space-y-3">
                    {item.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm text-stone-700">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark platform section */}
      <section className="bg-stone-900 py-20 sm:py-28 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
                One dashboard for your{" "}
                <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent font-serif italic">
                  entire agency
                </span>.
              </h2>
              <p className="mt-4 text-stone-300">
                Monitor every conversation, lead, and viewing from a single command center. Take over when the AI needs a human touch.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  "Unified inbox for all channels",
                  "Hot lead scoring and routing",
                  "Viewings calendar and reminders",
                  "Knowledge base and rule audit",
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm text-stone-300">
                    <CheckCircle className="h-4 w-4 text-teal-400" />
                    {point}
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button onClick={goToDashboard} className="rounded-full px-6 py-3 text-base bg-teal-500 hover:bg-teal-600 text-white">
                  Open Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-stone-700 bg-stone-800 p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-teal-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Command Center</p>
                  <p className="text-xs text-stone-400">Live pipeline</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "New WhatsApp Leads", value: "12", icon: Users },
                  { label: "Qualified Leads", value: "8", icon: BadgeCheck },
                  { label: "Viewings Booked", value: "5", icon: Calendar },
                  { label: "Hot Leads", value: "3", icon: Zap },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-2xl bg-stone-700/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-600/50 text-teal-300">
                        <row.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-stone-300">{row.label}</span>
                    </div>
                    <span className="text-lg font-semibold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 sm:py-28 bg-warm-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Up and running in <span className="font-serif italic text-teal-700">minutes</span>.
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.step} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <span className="text-4xl font-semibold text-stone-200">{step.step}</span>
                <h3 className="mt-4 text-lg font-semibold text-stone-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Chatbot highlight */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2.5rem] bg-stone-900 px-6 py-16 sm:px-16 sm:py-20">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  Your customer service, awake at{" "}
                  <span className="font-serif italic text-teal-300">3 AM</span>.
                </h2>
                <p className="mt-4 text-stone-300">
                  Upload your price lists, FAQs and project info. The AI quotes directly from your
                  content and books viewings while you rest.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    "Trained on your listings",
                    "Replies in BM, English, rojak",
                    "Hand off to human agents",
                    "Tracks every lead value",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-2 text-sm text-stone-300">
                      <CheckCircle className="h-4 w-4 text-teal-400" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative rounded-3xl bg-stone-800 p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-teal-300">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Aisha AI</p>
                    <p className="text-xs text-stone-400">Always online</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl rounded-bl-sm bg-stone-700 px-4 py-3 text-sm text-stone-200">
                    Hi! Berapa harga untuk Residensi Harmoni?
                  </div>
                  <div className="rounded-2xl rounded-br-sm bg-teal-700 px-4 py-3 text-sm text-white">
                    Residensi Harmoni bermula RM 580,000 untuk 3 bilik. Nak saya cari slot viewing?
                  </div>
                  <div className="rounded-2xl rounded-bl-sm bg-stone-700 px-4 py-3 text-sm text-stone-200">
                    Boleh. This Saturday 2pm?
                  </div>
                  <div className="rounded-2xl rounded-br-sm bg-teal-700 px-4 py-3 text-sm text-white">
                    Confirmed! Saturday 2pm. Saya hantar detail viewing sekarang. ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Simple, transparent, <span className="font-serif italic text-teal-700">actually affordable</span>.
            </h2>
            <p className="mt-4 text-stone-600">
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
                    ? "border-teal-700 bg-teal-50/50 shadow-lg"
                    : "border-stone-200 bg-white shadow-sm"
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {plan.tag}
                </span>
                <h3 className="mt-2 text-2xl font-semibold text-stone-900">{plan.name}</h3>
                <p className="mt-4 text-sm text-stone-600">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-stone-900">{plan.price}</span>
                  <span className="text-sm text-stone-500">{plan.period}</span>
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-stone-700">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={goToDashboard}
                  variant={plan.popular ? "primary" : "outline"}
                  className="mt-8 w-full rounded-full"
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              What our <span className="font-serif italic text-teal-700">agents</span> say.
            </h2>
            <p className="mt-4 text-stone-600">
              Malaysian agents and agencies using PropertyLah every day.
            </p>
          </div>

          <div className="mt-14 columns-1 gap-6 sm:columns-2 lg:columns-3">
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="mb-6 break-inside-avoid rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-stone-700">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{item.name}</p>
                    <p className="text-xs text-stone-500">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Ready to stop missing leads?
          </h2>
          <p className="mt-4 text-stone-600">
            Start your free trial. No credit card required. Cancel anytime.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={goToDashboard}
              className="w-full rounded-full px-8 text-base sm:w-auto"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <a
              href="mailto:hello@propertylah.ai"
              className="inline-flex w-full items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:w-auto"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-warm-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold text-stone-900">PropertyLah</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-500">
                The WhatsApp-first AI concierge that qualifies property leads and books viewings
                while you sleep.
              </p>
            </div>
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h4 className="text-sm font-semibold text-stone-900">{group.title}</h4>
                <ul className="mt-4 space-y-2">
                  {group.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-stone-500 transition hover:text-stone-900"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-stone-200 pt-8 sm:flex-row">
            <p className="text-xs text-stone-400">
              © {new Date().getFullYear()} PropertyLah. Built for Malaysian property agents.
            </p>
            <div className="flex items-center gap-4">
              <MessageSquare className="h-4 w-4 text-stone-400" />
              <Phone className="h-4 w-4 text-stone-400" />
              <FileText className="h-4 w-4 text-stone-400" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function VisualCard({ visual }: { visual: string }) {
  if (visual === "qualify") {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">Lead Score</p>
            <p className="text-xs text-stone-500">Updated automatically</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Hot
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {[
            { label: "Budget", value: "RM 600,000", ok: true },
            { label: "Timeline", value: "3 months", ok: true },
            { label: "Financing", value: "Loan approved", ok: true },
            { label: "Location", value: "KL / Selangor", ok: true },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-stone-500">{row.label}</span>
              <span className="flex items-center gap-1.5 font-medium text-stone-900">
                {row.ok && <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-warm-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Score</span>
            <span className="text-lg font-semibold text-emerald-700">92/100</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
            <div className="h-full w-[92%] rounded-full bg-emerald-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (visual === "match") {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">2 matches found</p>
        <div className="mt-4 space-y-3">
          {[
            { name: "Residensi Harmoni", price: "RM 580,000", beds: "3 beds · 2 baths", area: "KLCC" },
            { name: "The Horizon Suite", price: "RM 595,000", beds: "3 beds · 2 baths", area: "Bukit Bintang" },
          ].map((listing, i) => (
            <div key={listing.name} className="rounded-2xl bg-warm-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{listing.name}</p>
                  <p className="text-xs text-stone-500">{listing.beds} · {listing.area}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-700">{listing.price}</span>
              </div>
              {i === 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-teal-700">
                  <Shield className="h-3 w-3" />
                  Cited from agency inventory
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-teal-700" />
        <span className="text-sm font-semibold text-stone-900">This week</span>
      </div>
      <div className="space-y-3">
        {[
          { day: "Mon", slots: ["10:00 AM", "2:00 PM", "4:00 PM"], active: 1 },
          { day: "Tue", slots: ["10:00 AM", "2:00 PM", "4:00 PM"], active: null },
          { day: "Sat", slots: ["10:00 AM", "2:00 PM", "4:00 PM"], active: 1 },
        ].map((day) => (
          <div key={day.day} className="flex items-center gap-3">
            <span className="w-9 text-xs font-semibold text-stone-500">{day.day}</span>
            <div className="flex flex-1 gap-2">
              {day.slots.map((slot, i) => (
                <span
                  key={slot}
                  className={cn(
                    "rounded-lg px-2 py-1 text-[10px] font-medium",
                    i === day.active
                      ? "bg-teal-700 text-white"
                      : "bg-warm-100 text-stone-500"
                  )}
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-teal-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-teal-800">
          <CheckCircle className="h-4 w-4" />
          Saturday 2:00 PM confirmed
        </div>
        <p className="mt-1 text-xs text-teal-600">Residensi Harmoni · viewing details sent</p>
      </div>
    </div>
  );
}
