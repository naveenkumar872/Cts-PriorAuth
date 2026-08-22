import { getConfidenceColor } from "@/lib/utils";
import { Brain } from "lucide-react";

interface ConfidenceScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ConfidenceScore({ score, size = "md", showLabel = true }: ConfidenceScoreProps) {
  const color = getConfidenceColor(score);

  const sizeMap = {
    sm: { svg: 48, r: 18, stroke: 3, textSize: "text-[10px]" },
    md: { svg: 72, r: 26, stroke: 4, textSize: "text-[13px]" },
    lg: { svg: 96, r: 38, stroke: 5, textSize: "text-[16px]" },
  };

  const s = sizeMap[size];
  const circ = 2 * Math.PI * s.r;
  const prog = (score / 100) * circ;

  const label = score >= 80 ? "High" : score >= 60 ? "Medium" : "Low";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: s.svg, height: s.svg }}>
        <svg width={s.svg} height={s.svg} viewBox={`0 0 ${s.svg} ${s.svg}`} className="-rotate-90">
          <circle
            cx={s.svg / 2}
            cy={s.svg / 2}
            r={s.r}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={s.stroke}
          />
          <circle
            cx={s.svg / 2}
            cy={s.svg / 2}
            r={s.r}
            fill="none"
            stroke={color}
            strokeWidth={s.stroke}
            strokeDasharray={`${prog} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold leading-none ${s.textSize}`} style={{ color }}>
            {score}%
          </span>
        </div>
      </div>
      {showLabel && (
        <div className="flex items-center gap-1 text-center">
          <Brain className="h-3 w-3 text-slate-400" />
          <span className="text-[11px] text-slate-500">
            AI Confidence · <span className="font-semibold" style={{ color }}>{label}</span>
          </span>
        </div>
      )}
    </div>
  );
}

interface LinearConfidenceProps {
  score: number;
  label?: string;
}

export function LinearConfidence({ score, label }: LinearConfidenceProps) {
  const color = getConfidenceColor(score);
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-slate-500">{label}</span>
          <span className="text-xs font-semibold" style={{ color }}>{score}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
