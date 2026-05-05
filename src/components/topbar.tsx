import { Circle } from "lucide-react";

interface TopBarProps {
  title: string;
  sub?: string;
}

export function TopBar({ title, sub }: TopBarProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
