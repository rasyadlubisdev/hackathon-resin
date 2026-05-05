import type { ResinGrade } from "@/types";

const styles: Record<ResinGrade, { bg: string; color: string }> = {
  A: { bg: "#D4F0E0", color: "#1A6B3A" },
  B: { bg: "#FFF0D4", color: "#9A6000" },
  C: { bg: "#FCE4E4", color: "#B33A3A" },
};

export function GradeBadge({ grade }: { grade: ResinGrade }) {
  const s = styles[grade];
  return (
    <span
      style={{ background: s.bg, color: s.color }}
      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold font-mono"
    >
      Grade {grade}
    </span>
  );
}
