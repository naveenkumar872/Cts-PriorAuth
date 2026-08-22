import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Brain,
  XCircle,
  Users,
  Activity,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Brain,
  XCircle,
  Users,
  Activity,
};

interface KPICardProps {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  trend: "up" | "down" | "flat";
  icon: string;
  color?: "blue" | "green" | "amber" | "red" | "purple";
  className?: string;
}

const colorConfig: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    border: "border-blue-100",
    badge: "bg-blue-100 text-blue-700",
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600",
    border: "border-green-100",
    badge: "bg-green-100 text-green-700",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "text-amber-600",
    border: "border-amber-100",
    badge: "bg-amber-100 text-amber-700",
  },
  red: {
    bg: "bg-red-50",
    icon: "text-red-600",
    border: "border-red-100",
    badge: "bg-red-100 text-red-700",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    border: "border-purple-100",
    badge: "bg-purple-100 text-purple-700",
  },
};

export function KPICard({
  label,
  value,
  change,
  changeLabel,
  trend,
  icon,
  color = "blue",
  className,
}: KPICardProps) {
  const Icon = iconMap[icon] || FileText;
  const colors = colorConfig[color];
  const trendPositive = trend === "up" ? change > 0 : change < 0;

  return (
    <div
      className={cn(
        "card p-5 hover:shadow-md transition-all duration-200 cursor-default",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", colors.bg)}>
          <Icon className={cn("h-5 w-5", colors.icon)} />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            trendPositive
              ? "bg-green-50 text-green-700"
              : trend === "flat"
              ? "bg-slate-100 text-slate-600"
              : "bg-red-50 text-red-600"
          )}
        >
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3" />
          ) : trend === "down" ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {Math.abs(change)}%
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 text-[13px] font-medium text-slate-600">{label}</p>
        <p className="mt-1 text-[12px] text-slate-400">{changeLabel}</p>
      </div>
    </div>
  );
}
