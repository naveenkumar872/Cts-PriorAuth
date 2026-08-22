import type { AuditEntry } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  User,
  Bot,
  CheckCircle,
  AlertCircle,
  FileText,
  Edit,
  Send,
  Clock,
} from "lucide-react";

interface AuditLogProps {
  entries: AuditEntry[];
}

const actionIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "Case Submitted": Send,
  "Auto-assigned": Bot,
  "AI Triage Completed": Bot,
  "Case Opened": User,
  "Final Decision - Approved": CheckCircle,
  "Final Decision - Denied": AlertCircle,
  "Additional Info Requested": AlertCircle,
  "Document Uploaded": FileText,
  "Note Added": Edit,
  "Status Changed": Edit,
};

const actionColorMap: Record<string, string> = {
  "Final Decision - Approved": "bg-green-100 text-green-600",
  "Final Decision - Denied": "bg-red-100 text-red-600",
  "AI Triage Completed": "bg-purple-100 text-purple-600",
  "Auto-assigned": "bg-blue-100 text-blue-600",
  "Additional Info Requested": "bg-amber-100 text-amber-600",
};

export function AuditLog({ entries }: AuditLogProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-5 bottom-0 w-px bg-slate-100" />

      <div className="space-y-1">
        {entries.map((entry, i) => {
          const Icon = actionIconMap[entry.action] || Clock;
          const colorClass = actionColorMap[entry.action] || "bg-slate-100 text-slate-500";
          const isLast = i === entries.length - 1;

          return (
            <div key={entry.id} className={cn("relative flex gap-4 pb-5", isLast && "pb-0")}>
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm",
                  colorClass
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13.5px] font-semibold text-slate-900">{entry.action}</p>
                    <p className="text-[12px] text-slate-500">
                      {entry.performedBy}
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="text-slate-400">{entry.role}</span>
                    </p>
                  </div>
                  <time className="shrink-0 text-[11px] text-slate-400">
                    {formatDateTime(entry.timestamp)}
                  </time>
                </div>
                <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600">
                  {entry.details}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
