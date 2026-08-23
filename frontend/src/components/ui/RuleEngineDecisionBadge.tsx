import React from "react";
import { CheckCircle, ShieldAlert, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type RuleEngineDecision = "Approved" | "Nurse Review Required" | "More Info";

export function getRuleEngineDecision(raw?: string | null): RuleEngineDecision {
  if (!raw) return "Nurse Review Required";
  const s = raw.toLowerCase().trim();
  if (s === "approved" || s === "approve") return "Approved";
  if (s.includes("more info") || s.includes("more information") || s.includes("request more")) return "More Info";
  return "Nurse Review Required";
}

export const RULE_DECISION_CONFIG: Record<
  RuleEngineDecision,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }
> = {
  Approved: {
    label: "Approved",
    bg: "bg-emerald-100/90 hover:bg-emerald-100 text-emerald-800",
    text: "text-emerald-800 font-extrabold",
    border: "border-emerald-300",
    icon: CheckCircle,
    description: "Rule Engine Decision: Approved — Auto-approved by meeting all deterministic policy criteria.",
  },
  "Nurse Review Required": {
    label: "Nurse Review Required",
    bg: "bg-indigo-100/90 hover:bg-indigo-100 text-indigo-800",
    text: "text-indigo-800 font-extrabold",
    border: "border-indigo-300",
    icon: ShieldAlert,
    description: "Rule Engine Decision: Nurse Review Required — Complex case requiring manual clinical assessment.",
  },
  "More Info": {
    label: "More Info",
    bg: "bg-amber-100/90 hover:bg-amber-100 text-amber-800",
    text: "text-amber-800 font-extrabold",
    border: "border-amber-300",
    icon: AlertCircle,
    description: "Rule Engine Decision: More Info — Additional clinical evidence or documents are required.",
  },
};

interface RuleEngineDecisionBadgeProps {
  decision: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export function RuleEngineDecisionBadge({
  decision,
  size = "md",
  showIcon = true,
  className,
  fullWidth = false,
}: RuleEngineDecisionBadgeProps) {
  const norm = getRuleEngineDecision(decision);
  const cfg = RULE_DECISION_CONFIG[norm];
  const Icon = cfg.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1 rounded-md",
    md: "px-2.5 py-1 text-[12px] gap-1.5 rounded-lg",
    lg: "px-3.5 py-1.5 text-[13px] gap-2 rounded-xl",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <span
      title={cfg.description}
      className={cn(
        "inline-flex items-center justify-center border font-extrabold shadow-2xs transition-all whitespace-nowrap",
        cfg.bg,
        cfg.border,
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
    >
      {showIcon && <Icon className={cn("shrink-0", iconSizes[size])} />}
      <span>{cfg.label}</span>
    </span>
  );
}

export function RuleEngineDecisionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-medium">
      <div className="flex items-center gap-1.5 font-bold text-slate-800">
        <Info className="h-4 w-4 text-blue-600 shrink-0" />
        <span>Rule Engine Decision Types:</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(["Approved", "Nurse Review Required", "More Info"] as RuleEngineDecision[]).map((key) => {
          const cfg = RULE_DECISION_CONFIG[key];
          const Icon = cfg.icon;
          return (
            <div key={key} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-extrabold", cfg.bg, cfg.border)}>
                <Icon className="h-3 w-3 shrink-0" />
                {cfg.label}
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                {key === "Approved" ? "• Criteria Met" : key === "Nurse Review Required" ? "• Clinical Review Needed" : "• Missing Evidence"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
