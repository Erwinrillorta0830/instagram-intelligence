"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ClipboardCopy,
  Check,
  User,
  Users,
  BarChart3,
  FileText,
  RotateCcw,
  Lightbulb,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstagramAccount } from "@/types/instagram";

interface AnalysisRunData {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  accounts: Array<{
    account_id: string;
    role: "client" | "competitor";
    username: string;
    niche: string | null;
  }>;
  insights: {
    competitor_patterns: {
      themes: string[];
      hooks: string[];
      style: string;
      summary: string;
    };
    client_differences: {
      gaps: string[];
      strengths: string[];
      summary: string;
    };
    recommendations: {
      items: string[];
      summary: string;
    };
  } | null;
  scripts: Array<{
    id: string;
    script_number: number;
    title: string;
    hook: string;
    body: string;
    cta: string;
  }>;
}

interface AnalysisSectionProps {
  accounts: InstagramAccount[];
  onNavigateToAccounts?: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-500" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <ClipboardCopy className="size-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function ScriptCard({
  script,
}: {
  script: AnalysisRunData["scripts"][number];
}) {
  const [expanded, setExpanded] = useState(true);
  const fullText = `HOOK:\n${script.hook}\n\nBODY:\n${script.body}\n\nCTA:\n${script.cta}`;

  const rankColors = [
    "from-purple-500 to-indigo-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
  ];
  const colorClass = rankColors[(script.script_number - 1) % rankColors.length];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
      {/* Script Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-7 items-center justify-center rounded-lg bg-gradient-to-br ${colorClass} text-xs font-bold text-white shrink-0`}
          >
            {script.script_number}
          </span>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {script.title}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          <CopyButton text={fullText} />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Hook */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="size-3.5 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Hook
              </span>
            </div>
            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 px-3 py-2 italic">
              &ldquo;{script.hook}&rdquo;
            </p>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="size-3.5 text-purple-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Script
              </span>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {script.body}
            </p>
          </div>

          {/* CTA */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="size-3.5 text-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Call to Action
              </span>
            </div>
            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2">
              {script.cta}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusStep({
  label,
  status,
}: {
  label: string;
  status: "done" | "active" | "pending";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          status === "done"
            ? "border-emerald-500 bg-emerald-500"
            : status === "active"
            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
            : "border-zinc-200 bg-transparent dark:border-zinc-700"
        }`}
      >
        {status === "done" ? (
          <Check className="size-3.5 text-white" />
        ) : status === "active" ? (
          <Loader2 className="size-3 animate-spin text-purple-600" />
        ) : null}
      </div>
      <span
        className={`text-sm ${
          status === "done"
            ? "text-zinc-500 dark:text-zinc-400 line-through"
            : status === "active"
            ? "font-semibold text-zinc-900 dark:text-zinc-100"
            : "text-zinc-400 dark:text-zinc-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function AnalysisSection({ accounts, onNavigateToAccounts }: AnalysisSectionProps) {
  const [phase, setPhase] = useState<"setup" | "running" | "done" | "error">(
    "setup"
  );
  const [resultTab, setResultTab] = useState<
    "scripts" | "patterns" | "differences" | "recommendations" | "all"
  >("scripts");
  const [clientId, setClientId] = useState<string>("");
  const [competitorIds, setCompetitorIds] = useState<Set<string>>(new Set());
  const [isStarting, setIsStarting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [runData, setRunData] = useState<AnalysisRunData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pastRuns, setPastRuns] = useState<any[]>([]);
  const [loadingPastRuns, setLoadingPastRuns] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadPastRuns = useCallback(async () => {
    try {
      setLoadingPastRuns(true);
      const res = await fetch("/api/analyses");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPastRuns(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch past runs:", err);
    } finally {
      setLoadingPastRuns(false);
    }
  }, []);

  useEffect(() => {
    loadPastRuns();
  }, [loadPastRuns]);

  const pollRunStatus = useCallback(
    async (rid: string) => {
      try {
        const res = await fetch(`/api/analyses/${rid}/insights`);
        if (!res.ok) return;
        const json = await res.json();
        const data: AnalysisRunData = json.data;
        setRunData(data);

        if (data.status === "completed" || data.insights !== null) {
          stopPolling();
          setPhase("done");
          loadPastRuns();
        } else if (data.status === "failed") {
          stopPolling();
          setErrorMessage(data.error_message ?? "Analysis failed.");
          setPhase("error");
          loadPastRuns();
        }
      } catch {
        // Keep polling on network error
      }
    },
    [stopPolling, loadPastRuns]
  );

  const startPolling = useCallback(
    (rid: string) => {
      pollRunStatus(rid);
      pollingRef.current = setInterval(() => pollRunStatus(rid), 3000);

      // Elapsed timer
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    },
    [pollRunStatus]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const toggleCompetitor = (id: string) => {
    setCompetitorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 10) {
        next.add(id);
      }
      return next;
    });
  };

  const handleStartAnalysis = async () => {
    if (!clientId || competitorIds.size < 1) return;

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          competitorIds: Array.from(competitorIds),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to start analysis");
      }

      const rid = json.data.analysisId;
      setRunId(rid);
      setPhase("running");
      startPolling(rid);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to start analysis"
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelectPastRun = async (rid: string) => {
    setRunId(rid);
    setErrorMessage(null);
    setPhase("running");
    await pollRunStatus(rid);
  };

  const handleRegenerateInsights = async () => {
    const currentRunId = runData?.run_id || runId;
    if (!currentRunId) return;

    setIsRegenerating(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/analyses/${currentRunId}/insights`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate insights");
      }
      // Re-fetch updated run data
      await pollRunStatus(currentRunId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to regenerate insights"
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleReset = () => {
    stopPolling();
    setPhase("setup");
    setRunId(null);
    setRunData(null);
    setErrorMessage(null);
    setElapsedSeconds(0);
    setCompetitorIds(new Set());
    loadPastRuns();
  };

  const eligibleCompetitors = accounts.filter((a) => a.id !== clientId);
  const canStart =
    clientId !== "" && competitorIds.size >= 1 && competitorIds.size <= 10;

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0
      ? `${m}m ${sec.toString().padStart(2, "0")}s`
      : `${sec}s`;
  };

  // Determine progress steps for running phase
  const runStatus = runData?.status ?? "pending";

  // Suppress unused variable warning — runId is used to track state externally
  void runId;

  return (
    <section
      aria-labelledby="analysis-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6 pb-5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="analysis-heading"
                className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
              >
                Competitor Intelligence
              </h2>
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                AI
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Scrape top posts, transcribe videos, and generate 3 tailored scripts with AI
            </p>
          </div>
        </div>

        {(phase === "done" || phase === "error" || phase === "running") && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="size-3.5" />
            New Analysis
          </Button>
        )}
      </div>

      {/* ---- SETUP PHASE ---- */}
      {phase === "setup" && (
        <div className="space-y-6">
          {accounts.length < 2 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-10 text-center dark:border-zinc-800">
              <Users className="size-10 text-zinc-300 dark:text-zinc-700" />
              <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Add at least 2 accounts to run an analysis
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                You need 1 client account and at least 1 competitor
              </p>
              {onNavigateToAccounts && (
                <Button
                  onClick={onNavigateToAccounts}
                  size="sm"
                  className="mt-4 gap-1.5 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                >
                  <Users className="size-3.5" />
                  <span>Go to Accounts Manager</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Client selector */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  <User className="size-4 text-purple-600" />
                  Your Account (Client)
                </label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setCompetitorIds((prev) => {
                      const next = new Set(prev);
                      next.delete(e.target.value);
                      return next;
                    });
                  }}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-100"
                >
                  <option value="">Select your account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      @{a.username}
                      {a.niche ? ` · ${a.niche}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Competitor multi-select */}
              {clientId && (
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    <Users className="size-4 text-purple-600" />
                    Competitor Accounts
                    <span className="ml-auto text-xs font-normal text-zinc-500">
                      {competitorIds.size} selected · max 10
                    </span>
                  </label>

                  {eligibleCompetitors.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">
                      No other accounts available. Add competitors above.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 max-h-56 overflow-y-auto rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                      {eligibleCompetitors.map((a) => {
                        const selected = competitorIds.has(a.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => toggleCompetitor(a.id)}
                            disabled={!selected && competitorIds.size >= 10}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs text-left transition-all ${
                              selected
                                ? "border-purple-400 bg-purple-50 text-purple-900 dark:border-purple-700 dark:bg-purple-950/30 dark:text-purple-200"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            } disabled:opacity-40`}
                            aria-pressed={selected}
                          >
                            <div
                              className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                                selected
                                  ? "border-purple-500 bg-purple-500"
                                  : "border-zinc-300 dark:border-zinc-600"
                              }`}
                            >
                              {selected && (
                                <Check className="size-3 text-white" />
                              )}
                            </div>
                            <span className="truncate font-medium">
                              @{a.username}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                  <AlertCircle className="size-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Start button */}
              <Button
                onClick={handleStartAnalysis}
                disabled={!canStart || isStarting}
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting Analysis…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Run Analysis
                    {competitorIds.size > 0 &&
                      ` (${competitorIds.size + 1} accounts)`}
                  </>
                )}
              </Button>

              {competitorIds.size < 1 && clientId && (
                <p className="text-center text-xs text-zinc-400">
                  Select at least 1 competitor to continue
                </p>
              )}

              {/* Past Analysis Runs */}
              {pastRuns.length > 0 && (
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Previous Intelligence Runs ({pastRuns.length})
                    </span>
                    {loadingPastRuns && (
                      <Loader2 className="size-3 animate-spin text-zinc-400" />
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pastRuns.map((pr: any) => {
                      const clientAcc = pr.analysis_run_accounts?.find(
                        (a: any) => a.role === "client"
                      );
                      const compCount =
                        pr.analysis_run_accounts?.filter(
                          (a: any) => a.role === "competitor"
                        )?.length ?? 0;
                      const dateStr = new Date(pr.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      );

                      return (
                        <div
                          key={pr.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`size-2 rounded-full ${
                                pr.status === "completed"
                                  ? "bg-emerald-500"
                                  : pr.status === "running"
                                  ? "bg-purple-500 animate-pulse"
                                  : "bg-zinc-400"
                              }`}
                            />
                            <div>
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                @{clientAcc?.accounts?.username ?? "client"}
                              </span>{" "}
                              <span className="text-zinc-400">
                                vs {compCount} competitor{compCount !== 1 ? "s" : ""}
                              </span>
                              <span className="ml-2 text-zinc-400 font-mono text-[11px]">
                                {dateStr}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectPastRun(pr.id)}
                            className="h-7 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400"
                          >
                            View Results
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ---- RUNNING PHASE ---- */}
      {phase === "running" && (
        <div className="flex flex-col items-center py-6 gap-8">
          {/* Pulsing ring */}
          <div className="relative flex size-20 items-center justify-center">
            <div className="absolute size-20 animate-ping rounded-full bg-purple-200 opacity-50 dark:bg-purple-900/40" />
            <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
              <Sparkles className="size-6 text-white" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Analysis in Progress
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              This takes ~1–2 minutes while we scrape, transcribe, and analyze
            </p>
            <p className="mt-1.5 text-xs font-mono text-zinc-400">
              {formatElapsed(elapsedSeconds)} elapsed
            </p>
          </div>

          {/* Status steps */}
          <div className="w-full max-w-xs space-y-3">
            <StatusStep
              label="Scraping top posts via Apify"
              status={
                elapsedSeconds < 25 && runStatus === "pending"
                  ? "active"
                  : "done"
              }
            />
            <StatusStep
              label="Transcribing video audio with Gemini"
              status={
                elapsedSeconds < 25 && runStatus === "pending"
                  ? "pending"
                  : runStatus === "completed"
                  ? "done"
                  : "active"
              }
            />
            <StatusStep
              label="Generating AI insights & scripts"
              status={
                runStatus === "completed"
                  ? "done"
                  : "pending"
              }
            />
          </div>
        </div>
      )}

      {/* ---- ERROR PHASE ---- */}
      {phase === "error" && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40">
            <AlertCircle className="size-7 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Analysis Failed
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {errorMessage ?? "An unexpected error occurred."}
            </p>
          </div>
          <Button variant="outline" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="size-4" />
            Try Again
          </Button>
        </div>
      )}

      {/* ---- DONE PHASE — RESULTS ---- */}
      {phase === "done" && runData && (
        <div className="space-y-8">
          {/* Success header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  Analysis Complete
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Analyzed{" "}
                  {runData.accounts.filter((a) => a.role === "competitor").length}{" "}
                  competitors against @
                  {runData.accounts.find((a) => a.role === "client")?.username}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isRegenerating}
              onClick={handleRegenerateInsights}
              className="gap-1.5 text-xs self-start sm:self-auto bg-white dark:bg-zinc-900"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Generating with Gemini…</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 text-purple-600" />
                  <span>Regenerate Insights</span>
                </>
              )}
            </Button>
          </div>

          {runData.insights ? (
            (() => {
              const comp = runData.insights.competitor_patterns;
              const compThemes: string[] = comp?.themes ?? (comp as any)?.common_themes ?? [];
              const compHooks: string[] = comp?.hooks ?? (comp as any)?.hook_tactics ?? [];
              const compSummary: string = comp?.summary ?? "";
              const compStyle: string = comp?.style ?? (comp as any)?.pacing_and_audio ?? "";

              const diff = runData.insights.client_differences;
              const clientGaps: string[] = diff?.gaps ?? (diff as any)?.critical_gaps ?? [];
              const clientStrengths: string[] = diff?.strengths ?? (diff as any)?.untapped_strengths ?? [];
              const clientSummary: string = diff?.summary ?? "";

              const rec = runData.insights.recommendations;
              const recItems: string[] = rec?.items ?? (rec as any)?.actionable_rules ?? [];
              const recSummary: string = rec?.summary ?? "";

              const scripts = runData.scripts ?? [];

              return (
                <div className="space-y-6">
                  {/* Results Sub-Tab Navigation */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setResultTab("scripts")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        resultTab === "scripts"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      <FileText className="size-3.5 text-indigo-500" />
                      <span>3 Viral Scripts</span>
                      <span className="rounded-full bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                        {scripts.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResultTab("patterns")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        resultTab === "patterns"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      <BarChart3 className="size-3.5 text-purple-500" />
                      <span>Competitor Patterns</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResultTab("differences")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        resultTab === "differences"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      <Lightbulb className="size-3.5 text-amber-500" />
                      <span>Client Differences</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResultTab("recommendations")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        resultTab === "recommendations"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      <span>Strategic Advice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResultTab("all")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        resultTab === "all"
                          ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      <span>Full Report</span>
                    </button>
                  </div>

                  {/* 1. Generated Scripts (Shown when scripts or all is active) */}
                  {(resultTab === "scripts" || resultTab === "all") && scripts.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="size-5 text-indigo-600" />
                          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            3 AI-Generated Viral Scripts for @{runData.accounts.find((a) => a.role === "client")?.username}
                          </h3>
                        </div>
                        <span className="text-xs text-zinc-400">
                          Production-ready with Hook, Body & CTA
                        </span>
                      </div>
                      <div className="space-y-4">
                        {scripts.map((script) => (
                          <ScriptCard key={script.id || script.script_number} script={script} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Competitor Patterns (Shown when patterns or all is active) */}
                  {(resultTab === "patterns" || resultTab === "all") && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="size-5 text-purple-600" />
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          What Competitors Have in Common
                        </h3>
                      </div>

                      {compSummary && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {compSummary}
                        </p>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                            Recurring Themes
                          </p>
                          <ul className="space-y-1.5">
                            {compThemes.map((t, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                              >
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-purple-500" />
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                            Hook Patterns
                          </p>
                          <ul className="space-y-1.5">
                            {compHooks.map((h, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                              >
                                <Zap className="size-3.5 mt-0.5 shrink-0 text-amber-500" />
                                {h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {compStyle && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                          Content style: {compStyle}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3. Client Differences (Shown when differences or all is active) */}
                  {(resultTab === "differences" || resultTab === "all") && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="size-5 text-amber-500" />
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          How Your Content Differs
                        </h3>
                      </div>

                      {clientSummary && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {clientSummary}
                        </p>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/10">
                          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400 mb-2">
                            Gaps to Address
                          </p>
                          <ul className="space-y-1.5">
                            {clientGaps.map((g, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                              >
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" />
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">
                            Your Strengths
                          </p>
                          <ul className="space-y-1.5">
                            {clientStrengths.map((s, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                              >
                                <CheckCircle2 className="size-3.5 mt-0.5 shrink-0 text-emerald-500" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Recommendations (Shown when recommendations or all is active) */}
                  {(resultTab === "recommendations" || resultTab === "all") && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-5 text-emerald-600" />
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          Strategic Recommendations
                        </h3>
                      </div>

                      {recSummary && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {recSummary}
                        </p>
                      )}

                      <ul className="space-y-2">
                        {recItems.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-300"
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {i + 1}
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center gap-3">
              <Sparkles className="size-8 text-purple-500 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Post Scraping and Transcription Completed!
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Click below to generate competitive patterns and 3 viral scripts with Gemini.
                </p>
              </div>
              <Button
                onClick={handleRegenerateInsights}
                disabled={isRegenerating}
                className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating with Gemini…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate Insights & 3 Scripts Now
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
