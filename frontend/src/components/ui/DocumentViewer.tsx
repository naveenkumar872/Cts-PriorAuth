import type { ClinicalDocument } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { FileText, Image, FlaskConical, FileCheck, Download, Eye, Upload } from "lucide-react";

interface DocumentViewerProps {
  documents: ClinicalDocument[];
  onUpload?: () => void;
}

const docTypeConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  imaging: { icon: Image, color: "text-purple-500 bg-purple-50", label: "Imaging" },
  lab_result: { icon: FlaskConical, color: "text-green-500 bg-green-50", label: "Lab Result" },
  clinical_note: { icon: FileText, color: "text-blue-500 bg-blue-50", label: "Clinical Note" },
  referral: { icon: FileCheck, color: "text-amber-500 bg-amber-50", label: "Referral" },
  prior_auth: { icon: FileCheck, color: "text-slate-500 bg-slate-50", label: "Prior Auth" },
  insurance_card: { icon: FileCheck, color: "text-rose-500 bg-rose-50", label: "Insurance" },
};

export function DocumentViewer({ documents, onUpload }: DocumentViewerProps) {
  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const config = docTypeConfig[doc.type] || docTypeConfig.clinical_note;
        const Icon = config.icon;
        return (
          <div
            key={doc.id}
            className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3.5 transition-all hover:border-blue-200 hover:shadow-sm"
          >
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13.5px] font-medium text-slate-900">{doc.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400">{config.label}</span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-400">{doc.size}</span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-400">{formatDateTime(doc.uploadedAt)}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Uploaded by {doc.uploadedBy}</p>
            </div>
            <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {onUpload && (
        <button
          onClick={onUpload}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3.5 text-[13px] font-medium text-slate-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      )}
    </div>
  );
}
