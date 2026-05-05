"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { getCycles } from "@/lib/firestore";
import type { Cycle, ResinGrade } from "@/types";
import { RESIN_COLORS, PRICE_REF } from "@/types";
import { fmtRp } from "@/lib/utils";
import { TopBar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const TARGET_KG = 200;

interface StockEntry {
  A: number;
  B: number;
  C: number;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCycles(user.uid)
      .then(setCycles)
      .finally(() => setLoading(false));
  }, [user]);

  const stockMap: Record<string, StockEntry> = {};
  cycles.forEach((c) =>
    c.resins.forEach((r) => {
      if (!stockMap[r.type]) stockMap[r.type] = { A: 0, B: 0, C: 0 };
      stockMap[r.type][r.grade as ResinGrade] =
        (stockMap[r.type][r.grade as ResinGrade] || 0) + r.kg;
    })
  );

  const entries = Object.entries(stockMap);

  return (
    <div>
      <TopBar
        title="Inventori Resin"
        sub="Stok kumulatif dari semua batch"
      />

      {loading ? (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          Memuat inventori...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-sm text-muted-foreground">
          Belum ada data inventori
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {entries.map(([type, grades]) => {
            const total = grades.A + grades.B + grades.C;
            const rev = total * (PRICE_REF[type] || 0);
            const color = RESIN_COLORS[type] || "#888";
            const pct = Math.min((total / TARGET_KG) * 100, 100);

            return (
              <Card key={type}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ background: color }}
                      />
                      <span className="font-bold text-lg">{type}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-primary">
                      {total.toFixed(1)} kg
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-2 rounded-full overflow-hidden flex">
                    {grades.A > 0 && (
                      <div
                        className="h-full"
                        style={{
                          width: `${(grades.A / total) * 100}%`,
                          background: "#1A6B3A",
                        }}
                      />
                    )}
                    {grades.B > 0 && (
                      <div
                        className="h-full"
                        style={{
                          width: `${(grades.B / total) * 100}%`,
                          background: "#E09B2D",
                        }}
                      />
                    )}
                    {grades.C > 0 && (
                      <div
                        className="h-full"
                        style={{
                          width: `${(grades.C / total) * 100}%`,
                          background: "#D94F4F",
                        }}
                      />
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {(
                      [
                        ["A", grades.A, "#D4F0E0", "#1A6B3A"],
                        ["B", grades.B, "#FFF0D4", "#9A6000"],
                        ["C", grades.C, "#FCE4E4", "#B33A3A"],
                      ] as [string, number, string, string][]
                    ).map(([g, v, bg, c]) => (
                      <span
                        key={g}
                        className="text-[11px] px-2 py-0.5 rounded font-semibold font-mono"
                        style={{ background: bg, color: c }}
                      >
                        {g}: {v.toFixed(1)} kg
                      </span>
                    ))}
                  </div>

                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Target offtake: {TARGET_KG} kg
                    </p>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-muted-foreground">
                      Est. nilai{" "}
                      <span className="font-mono font-semibold text-primary">
                        {fmtRp(rev)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-7"
                      onClick={() => toast.info(`Stok ${type} ditandai terjual`)}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Terjual
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
