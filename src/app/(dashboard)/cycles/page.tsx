"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getCycles } from "@/lib/firestore";
import type { Cycle } from "@/types";
import { revenue, recovery } from "@/types";
import { fmtRp } from "@/lib/utils";
import { TopBar } from "@/components/topbar";
import { GradeBadge } from "@/components/grade-badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CyclesPage() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCycles(user.uid)
      .then(setCycles)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div>
      <TopBar
        title="Riwayat Siklus"
        sub={loading ? "Memuat..." : `${cycles.length} batch tercatat`}
      />

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Memuat data siklus...
          </div>
        ) : cycles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-sm text-muted-foreground">Belum ada siklus tercatat</p>
            <Link href="/new-cycle" className="text-sm text-primary font-semibold hover:underline">
              Buat siklus pertama
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Cycle ID",
                  "Waktu",
                  "Sumber",
                  "Input",
                  "Output",
                  "Recovery",
                  "Durasi",
                  "Grade",
                  "Pendapatan",
                  "",
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((c) => {
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
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {c.ts}
                    </TableCell>
                    <TableCell className="text-sm">{c.supplier}</TableCell>
                    <TableCell className="font-mono text-sm">{c.inputKg} kg</TableCell>
                    <TableCell className="font-mono text-sm">{c.outputKg} kg</TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-primary">
                      {recovery(c)}%
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.duration} mnt</TableCell>
                    <TableCell>{topGrade && <GradeBadge grade={topGrade} />}</TableCell>
                    <TableCell className="font-mono text-[11px] text-primary font-medium">
                      {fmtRp(revenue(c))}
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
    </div>
  );
}
