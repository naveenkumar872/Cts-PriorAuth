import { cn } from "@/lib/utils";
import type { AuthorizationStatus, RiskLevel } from "@/types";
import { CheckCircle, Clock, XCircle, AlertCircle, ShieldAlert } from "lucide-react";

interface StatusBadgeProps {
  status: AuthorizationStatus;
  size?: "sm" | "md" | "lg";
  forProvider?: boolean;
}

const statusConfig: Record<
  AuthorizationStatus,
  { className: string; icon: React.ComponentType<{ className?: string }>; dot: string }
> = {
  Approved: {
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
    dot: "bg-emerald-500",
  },
  "Pending Review": {
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
    dot: "bg-amber-500",
  },
  Denied: {
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
    dot: "bg-rose-500",
  },
  "Not Approved": {
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
    dot: "bg-rose-500",
  },
  "More Information Required": {
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertCircle,
    dot: "bg-amber-500",
  },
  "Under Review": {
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock,
    dot: "bg-blue-500",
  },
  "Nurse Review Required": {
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: ShieldAlert,
    dot: "bg-indigo-500",
  },
  Rejected: {
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
    dot: "bg-rose-500",
  },
};

const sizeConfig = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-1 text-[12px] gap-1.5",
  lg: "px-3 py-1.5 text-[13px] gap-2",
};

export function StatusBadge({ status, size = "md", forProvider = false }: StatusBadgeProps) {
  const isPending = forProvider && ["Nurse Review Required", "Under Review", "Pending Review"].includes(status);
  const targetKey = isPending ? "Pending Review" : status;
  const config = statusConfig[targetKey as AuthorizationStatus] ?? statusConfig["Pending Review"];
  const Icon = config.icon;
  const labelText = isPending ? "Pending" : status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.className,
        sizeConfig[size]
      )}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")} />
      {labelText}
    </span>
  );
}

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const riskConfig: Record<RiskLevel, { className: string; label: string }> = {
  high: { className: "bg-red-50 text-red-700 border-red-200", label: "High Risk" },
  medium: { className: "bg-amber-50 text-amber-700 border-amber-200", label: "Medium Risk" },
  low: { className: "bg-green-50 text-green-700 border-green-200", label: "Low Risk" },
};

export function RiskBadge({ level, size = "md", showLabel = true }: RiskBadgeProps) {
  const config = riskConfig[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.className,
        sizeConfig[size]
      )}
    >
      <ShieldAlert className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {showLabel ? config.label : level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

interface PriorityDotProps {
  priority: "urgent" | "high" | "normal" | "low";
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  urgent: { color: "bg-red-500", label: "Urgent" },
  high: { color: "bg-amber-500", label: "High" },
  normal: { color: "bg-blue-400", label: "Normal" },
  low: { color: "bg-slate-400", label: "Low" },
};

export function PriorityBadge({ priority }: PriorityDotProps) {
  const config = priorityConfig[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className={cn("h-2 w-2 rounded-full", config.color)} />
      {config.label}
    </span>
  );
}
