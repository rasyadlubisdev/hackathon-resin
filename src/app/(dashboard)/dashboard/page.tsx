"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { getCycles } from "@/lib/firestore";
import type { Cycle } from "@/types";
import { revenue } from "@/types";
import { fmt as fmtNum, fmtRp as fmtRpUtil } from "@/lib/utils";
import { TopBar } from "@/components/topbar";
import { GradeBadge } from "@/components/grade-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RANGE_OPTIONS = ["Harian", "Mingguan", "Bulanan"] as const;
type Range = (typeof RANGE_OPTIONS)[number];

export default function DashboardPage() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [range, setRange] = useState<Range>("Harian");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCycles(user.uid)
      .then(setCycles)
      .finally(() => setLoading(false));
  }, [user]);

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const shown =
    range === "Harian"
      ? cycles.filter((c) => c.id.includes(today))
      : cycles;

  const totalIn = shown.reduce((s, c) => s + c.inputKg, 0);
  const totalOut = shown.reduce((s, c) => s + c.outputKg, 0);
  const totalRev = shown.reduce((s, c) => s + revenue(c), 0);

  const supplierMap: Record<string, number> = {};
  cycles.forEach((c) => {
    supplierMap[c.supplier] = (supplierMap[c.supplier] || 0) + c.inputKg;
  });
  const supplierChart = Object.entries(supplierMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, kg]) => ({ name, kg }));
  const maxKg = supplierChart[0]?.kg || 1;

  const stats = [
    { label: "Total Batch", value: String(shown.length), sub: "siklus selesai", icon: RefreshCw },
    { label: "Total Input", value: fmtNum(totalIn) + " kg", sub: "berat masuk", icon: ArrowDownCircle },
    { label: "Total Output", value: fmtNum(totalOut) + " kg", sub: "berat keluar", icon: ArrowUpCircle },
    { label: "Est. Pendapatan", value: fmtRpUtil(totalRev), sub: "harga referensi", icon: Banknote, accent: true },
  ];

  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <TopBar title="Dashboard" sub={`${dateStr} - Ringkasan Operasional`} />

      <div className="flex gap-1.5 mb-5">
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              range === r
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-5">
        {stats.map(({ label, value, sub, icon: Icon, accent }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1.5">{label}</p>
                  <p
                    className={`text-xl font-bold font-mono tracking-tight ${
                      accent ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {loading ? "-" : value}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
                </div>
                <Icon className={`w-5 h-5 mt-0.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-3.5">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border flex-row items-center justify-between py-3.5">
            <CardTitle>Riwayat Siklus Terbaru</CardTitle>
            <Link
              href="/cycles"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
            >
              Lihat semua <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Memuat data...
            </div>
          ) : shown.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Belum ada siklus hari ini
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {["Cycle ID", "Sumber", "Input", "Output", "Grade", ""].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.slice(0, 5).map((c) => {
                  const topGrade = [...c.resins].sort((a, b) =>
                    a.grade.localeCompare(b.grade)
                  )[0]?.grade;
                  return (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/cycles/${c.firestoreId}`}
                          className="font-mono text-[11px] text-primary font-medium hover:underline"
                        >
                          {c.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{c.supplier}</TableCell>
                      <TableCell className="font-mono text-sm">{c.inputKg} kg</TableCell>
                      <TableCell className="font-mono text-sm">{c.outputKg} kg</TableCell>
                      <TableCell>
                        {topGrade && <GradeBadge grade={topGrade} />}
                      </TableCell>
                      <TableCell>
                        <Link href={`/cycles/${c.firestoreId}`}>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Top Supplier (kg Input)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cycles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
            ) : (
              supplierChart.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                      {s.name}
                    </span>
                    <span className="text-[11px] font-mono font-semibold">{s.kg} kg</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(s.kg / maxKg) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
