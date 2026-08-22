import type { AIRecommendation } from "@/types";
import { cn } from "@/lib/utils";
import { ConfidenceScore } from "./ConfidenceScore";
import {
  Brain,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Clock,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface AIRecommendationCardProps {
  recommendation: AIRecommendation;
  compact?: boolean;
}

const decisionConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string; badge: string }
> = {
  Approve: {
    icon: CheckCircle,
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    badge: "bg-green-100 text-green-700",
  },
  Deny: {
    icon: XCircle,
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  "Request More Info": {
    icon: AlertCircle,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  Escalate: {
    icon: ArrowUpRight,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
};

const impactIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
};

const impactColor: Record<string, string> = {
  positive: "text-green-600",
  negative: "text-red-600",
  neutral: "text-slate-500",
};

export function AIRecommendationCard({ recommendation, compact = false }: AIRecommendationCardProps) {
  const config = decisionConfig[recommendation.decision];
  const Icon = config.icon;

  return (
    <div className={cn("card overflow-hidden border-2", config.border)}>
      {/* Header */}
      <div className={cn("flex items-center justify-between px-5 py-4", config.bg)}>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", config.bg, "border", config.border)}>
            <Icon className={cn("h-5 w-5", config.text)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                AI Recommendation
              </span>
              <Brain className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className={cn("text-xl font-bold", config.text)}>{recommendation.decision}</p>
          </div>
        </div>
        <ConfidenceScore score={recommendation.confidence} size="md" />
      </div>

      <div className="p-5 space-y-5">
        {/* Reasoning */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            AI Reasoning
          </p>
          <p className="text-[13.5px] leading-relaxed text-slate-700">{recommendation.reasoning}</p>
        </div>

        {!compact && (
          <>
            {/* Key Factors */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Key Decision Factors
              </p>
              <div className="space-y-2.5">
                {recommendation.keyFactors.map((factor, i) => {
                  const ImpactIcon = impactIcon[factor.impact];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-50", impactColor[factor.impact])}>
                        <ImpactIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-slate-800">{factor.name}</span>
                          <span className="shrink-0 text-[11px] font-medium text-slate-500">{factor.weight}%</span>
                        </div>
                        <p className="text-[12px] text-slate-500">{factor.description}</p>
                        <div className="mt-1 h-1 w-full rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-1 rounded-full",
                              factor.impact === "positive"
                                ? "bg-green-400"
                                : factor.impact === "negative"
                                ? "bg-red-400"
                                : "bg-slate-300"
                            )}
                            style={{ width: `${factor.weight}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Missing Info */}
            {recommendation.missingInfo.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-[13px] font-semibold text-amber-800">Missing Information</p>
                </div>
                <ul className="space-y-1.5">
                  {recommendation.missingInfo.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-amber-700">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Policy References */}
            {recommendation.policyReferences.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Policy References
                </p>
                <div className="space-y-2">
                  {recommendation.policyReferences.map((ref) => (
                    <div key={ref.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-slate-800 truncate">{ref.title}</span>
                          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            {ref.relevanceScore}% match
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{ref.section}</p>
                        <p className="mt-1 text-[12px] text-slate-600 line-clamp-2 italic">"{ref.excerpt}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Brain className="h-3 w-3" />
            {recommendation.modelVersion}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" />
            {formatDateTime(recommendation.generatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
