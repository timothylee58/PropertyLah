"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { KnowledgeSource, AgentRule, KnowledgeTestResult, RulePriority, RuleCategory } from "@/lib/types";
import {
  getKnowledgeSources,
  getAgentRules,
  uploadKnowledgeSource,
  toggleKnowledgeSource,
  deleteKnowledgeSource,
  createAgentRule,
  updateAgentRule,
  deleteAgentRule,
  testKnowledgeAgent,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import {
  BookOpen,
  FileText,
  Upload,
  X,
  Trash2,
  Eye,
  Power,
  Plus,
  MessageSquare,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  GripVertical,
} from "lucide-react";

const VALID_EXTENSIONS = [".pdf", ".docx", ".csv", ".xlsx", ".txt", ".md"];

const categoryStyles: Record<KnowledgeSource["category"], { icon: React.ElementType; color: string }> = {
  "Property brochure": { icon: BookOpen, color: "bg-sky-100 text-sky-700" },
  Inventory: { icon: FileText, color: "bg-emerald-100 text-emerald-700" },
  FAQ: { icon: MessageSquare, color: "bg-violet-100 text-violet-700" },
  "Agency policy": { icon: Shield, color: "bg-amber-100 text-amber-700" },
  "Market data": { icon: Search, color: "bg-rose-100 text-rose-700" },
  Other: { icon: FileText, color: "bg-stone-100 text-stone-600" },
};

const statusStyles: Record<KnowledgeSource["status"], string> = {
  Processing: "bg-stone-100 text-stone-600",
  Indexing: "bg-sky-100 text-sky-700",
  Ready: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
  Disabled: "bg-stone-100 text-stone-400",
  Pending: "bg-amber-100 text-amber-700",
  needs_review: "bg-amber-100 text-amber-700",
};

const priorityStyles: Record<RulePriority, string> = {
  High: "bg-rose-100 text-rose-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-stone-100 text-stone-600",
};

const sampleQuestions = [
  "Does KLCC Residences have a swimming pool?",
  "What is the listed price?",
  "Can you guarantee my loan will be approved?",
  "Saya mahu bercakap dengan ejen manusia.",
];

interface RuleFormData {
  title: string;
  instruction: string;
  priority: RulePriority;
  category: RuleCategory;
  enabled: boolean;
}

export default function KnowledgePage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [rules, setRules] = useState<AgentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState<KnowledgeTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [ruleSheetOpen, setRuleSheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AgentRule | null>(null);
  const [previewSource, setPreviewSource] = useState<KnowledgeSource | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormData>({
    title: "",
    instruction: "",
    priority: "Medium",
    category: "Other",
    enabled: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [newSources, newRules] = await Promise.all([getKnowledgeSources(), getAgentRules()]);
    setSources(newSources);
    setRules(newRules);
  };

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, []);

  // Poll for source status changes (simulated upload/indexing)
  useEffect(() => {
    const hasInProgress = sources.some((s) => s.status === "Processing" || s.status === "Indexing");
    if (!hasInProgress) return;
    const id = setInterval(() => refresh(), 1000);
    return () => clearInterval(id);
  }, [sources]);

  const enabledSources = useMemo(() => sources.filter((s) => s.enabled), [sources]);
  const enabledRules = useMemo(() => rules.filter((r) => r.enabled), [rules]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!VALID_EXTENSIONS.includes(ext)) {
      setUploadError(`Unsupported file type. Accepted: ${VALID_EXTENSIONS.join(", ")}`);
      setUploading(false);
      return;
    }

    await uploadKnowledgeSource(file);
    await refresh();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await uploadKnowledgeSource(file);
    await refresh();
  };

  const handleToggleSource = async (id: string, enabled: boolean) => {
    await toggleKnowledgeSource(id, enabled);
    await refresh();
  };

  const handleDeleteSource = async (id: string) => {
    await deleteKnowledgeSource(id);
    await refresh();
  };

  const openAddRule = () => {
    setEditingRule(null);
    setRuleForm({ title: "", instruction: "", priority: "Medium", category: "Other", enabled: true });
    setRuleSheetOpen(true);
  };

  const openEditRule = (rule: AgentRule) => {
    setEditingRule(rule);
    setRuleForm({
      title: rule.title,
      instruction: rule.instruction,
      priority: rule.priority,
      category: rule.category,
      enabled: rule.enabled,
    });
    setRuleSheetOpen(true);
  };

  const handleSaveRule = async () => {
    if (!ruleForm.title.trim() || !ruleForm.instruction.trim()) return;
    if (editingRule) {
      await updateAgentRule(editingRule.id, ruleForm);
    } else {
      await createAgentRule(ruleForm);
    }
    setRuleSheetOpen(false);
    await refresh();
  };

  const handleDeleteRule = async (id: string) => {
    await deleteAgentRule(id);
    await refresh();
  };

  const handleTest = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    const result = await testKnowledgeAgent(testQuery);
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div className="min-h-full bg-warm-50 p-4 pb-10 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Knowledge & Rules</h1>
            <p className="text-sm text-stone-500">
              Control what PropertyLah knows, what it can say, and when it must involve a human.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept={VALID_EXTENSIONS.join(",")} />
              <span className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800">
                {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                Upload documents
              </span>
            </label>
            <Button onClick={openAddRule}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add rule
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const panel = document.getElementById("test-panel");
                panel?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Test agent
            </Button>
          </div>
        </div>

        {uploadError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{uploadError}</div>
        )}

        {/* Knowledge sources */}
        <Card className="border-stone-200">
          <CardHeader className="border-b border-stone-100 pb-4">
            <h2 className="text-sm font-semibold text-stone-900">Knowledge sources</h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-warm-50 p-8 text-center transition hover:border-teal-600 hover:bg-teal-50/30"
            >
              <Upload className="mb-2 h-6 w-6 text-stone-400" />
              <p className="text-sm font-medium text-stone-700">Drop files here or click Upload documents</p>
              <p className="text-xs text-stone-500">Supports .pdf, .docx, .csv, .xlsx, .txt, .md</p>
            </div>

            {loading ? (
              <p className="text-sm text-stone-500">Loading knowledge sources…</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="bg-warm-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Scope</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Version</th>
                      <th className="px-4 py-3">Last updated</th>
                      <th className="px-4 py-3">Enabled</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {sources.map((source) => {
                      const { icon: Icon, color } = categoryStyles[source.category] || categoryStyles["Other"];
                      return (
                        <tr key={source.id} className={source.enabled ? "bg-white" : "bg-stone-50/50 text-stone-400"}>
                          <td className="px-4 py-3 font-medium text-stone-900">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-stone-500" />
                              {source.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={cn(color, "rounded-md")}>{source.category}</Badge>
                          </td>
                          <td className="px-4 py-3 text-stone-600">{source.scope}</td>
                          <td className="px-4 py-3">
                            <Badge className={cn(statusStyles[source.status], "rounded-md")}>{source.status}</Badge>
                            {source.simulated && source.status !== "Ready" && (
                              <span className="ml-1.5 text-[10px] text-stone-400">simulated</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-stone-600">{source.version}</td>
                          <td className="px-4 py-3 text-stone-600">{new Date(source.lastUpdated).toLocaleDateString("en-MY")}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleSource(source.id, !source.enabled)}
                              className={cn(
                                "relative inline-flex h-5 w-9 items-center rounded-full transition",
                                source.enabled ? "bg-emerald-600" : "bg-stone-300"
                              )}
                              aria-label="Toggle source"
                            >
                              <span
                                className={cn(
                                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition",
                                  source.enabled ? "translate-x-5" : "translate-x-1"
                                )}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewSource(source)}
                                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
                                aria-label="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSource(source.id)}
                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {sources.length === 0 && <p className="p-6 text-center text-sm text-stone-500">No knowledge sources yet.</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent rules */}
        <Card className="border-stone-200">
          <CardHeader className="flex flex-col gap-2 border-b border-stone-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Agent rules</h2>
              <p className="text-xs text-stone-500">High-priority rules override lower-priority instructions.</p>
            </div>
            <Badge variant="soft" className="w-fit">{enabledRules.length} of {rules.length} active</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "rounded-2xl border p-4 transition",
                  rule.enabled ? "border-stone-200 bg-white" : "border-stone-100 bg-stone-50/50 text-stone-400"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-stone-300" />
                      <p className="font-semibold text-stone-900">{rule.title}</p>
                      <Badge className={cn(priorityStyles[rule.priority], "rounded-md text-[10px]")}>
                        {rule.priority}
                      </Badge>
                      <Badge className="bg-warm-100 text-stone-700 rounded-md text-[10px]">{rule.category}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-stone-700">{rule.instruction}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditRule(rule)}
                      className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {rules.length === 0 && <p className="text-sm text-stone-500">No rules yet.</p>}
          </CardContent>
        </Card>

        {/* Test agent panel */}
        <Card id="test-panel" className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="border-b border-emerald-100/50 pb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-emerald-900">Test PropertyLah against your knowledge base</h2>
            </div>
            <p className="text-xs text-emerald-800/70">Verify answers before enabling them for WhatsApp leads.</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTest()}
                placeholder="Ask a test question…"
                className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/10"
              />
              <Button onClick={handleTest} disabled={testing || !testQuery.trim()}>
                {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
                Test
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setTestQuery(q);
                    handleTest();
                  }}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  {q}
                </button>
              ))}
            </div>

            {testResult && (
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                {testResult.handoff && (
                  <div className="mb-3 flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Handoff triggered — {testResult.handoffReason}
                  </div>
                )}
                <p className="text-sm leading-relaxed text-stone-800">{testResult.answer}</p>
                <div className="mt-4 space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Sources used</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {testResult.sources.map((s) => (
                        <Badge key={s} variant="soft" className="rounded-md">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Rules applied</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {testResult.rules.map((r) => (
                        <Badge key={r} className="rounded-md bg-teal-100 text-teal-800">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-stone-400" />
          <p>
            <span className="font-medium">Demo mode active.</span> Uploads, indexing, and test responses are simulated
            on this device. In production these would be processed by a backend extraction and embedding pipeline.
          </p>
        </div>
      </div>

      {/* Rule sheet */}
      <Sheet open={ruleSheetOpen} onClose={() => setRuleSheetOpen(false)} title={editingRule ? "Edit rule" : "Add rule"}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-700">Title</label>
            <Input
              value={ruleForm.title}
              onChange={(e) => setRuleForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Rule title"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-700">Instruction</label>
            <Textarea
              value={ruleForm.instruction}
              onChange={(e) => setRuleForm((f) => ({ ...f, instruction: e.target.value }))}
              placeholder="What should the agent do?"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700">Priority</label>
              <select
                value={ruleForm.priority}
                onChange={(e) => setRuleForm((f) => ({ ...f, priority: e.target.value as RulePriority }))}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-teal-700 focus:outline-none"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700">Category</label>
              <select
                value={ruleForm.category}
                onChange={(e) => setRuleForm((f) => ({ ...f, category: e.target.value as RuleCategory }))}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-teal-700 focus:outline-none"
              >
                <option>Compliance</option>
                <option>Escalation</option>
                <option>Booking</option>
                <option>Language</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={ruleForm.enabled}
              onChange={(e) => setRuleForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-stone-300 text-teal-700 focus:ring-teal-700"
            />
            Enabled
          </label>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSaveRule} className="flex-1">{editingRule ? "Save changes" : "Create rule"}</Button>
            <Button variant="secondary" onClick={() => setRuleSheetOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Sheet>

      {/* Preview modal */}
      {previewSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-900">Preview</h3>
              <button onClick={() => setPreviewSource(null)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm font-medium text-stone-900">{previewSource.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className={cn(categoryStyles[previewSource.category]?.color)}>{previewSource.category}</Badge>
              <Badge className={cn(statusStyles[previewSource.status])}>{previewSource.status}</Badge>
            </div>
            <p className="mt-4 text-sm text-stone-600">
              This is a demo-mode preview. No real text extraction has been performed on this file.
            </p>
            {previewSource.size && <p className="mt-2 text-xs text-stone-400">Size: {previewSource.size}</p>}
            <p className="mt-1 text-xs text-stone-400">Scope: {previewSource.scope}</p>
          </div>
        </div>
      )}
    </div>
  );
}
