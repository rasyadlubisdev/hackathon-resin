"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getCycle } from "@/lib/firestore";
import type { Cycle } from "@/types";
import { revenue, recovery, STAGES_META, RESIN_COLORS, PRICE_REF } from "@/types";
import { fmtRp } from "@/lib/utils";
import { GradeBadge } from "@/components/grade-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

export default function CycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    getCycle(user.uid, id)
      .then(setCycle)
      .finally(() => setLoading(false));
  }, [user, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Memuat detail siklus...
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-muted-foreground">Siklus tidak ditemukan</p>
        <Button variant="outline" onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const rev = revenue(cycle);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>
        <h1 className="text-xl font-bold text-foreground">Detail Siklus</h1>
        <span className="font-mono text-xs text-primary bg-accent px-3 py-1 rounded-md">
          {cycle.id}
        </span>
        <div className="ml-auto">
          <Button size="sm" variant="outline" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 mb-3.5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Informasi Batch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Cycle ID" value={cycle.id} mono />
            <InfoRow label="Waktu" value={cycle.ts} />
            <InfoRow label="Sumber" value={cycle.supplier} />
            <InfoRow label="Operator" value={user?.displayName ?? user?.email ?? "Operator"} />
            <InfoRow label="Catatan" value={cycle.notes || "Tidak ada catatan"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Ringkasan Proses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Berat Input" value={`${cycle.inputKg} kg`} />
            <InfoRow label="Berat Output" value={`${cycle.outputKg} kg`} />
            <InfoRow label="Recovery Rate" value={`${recovery(cycle)}%`} />
            <InfoRow label="Total Durasi" value={`${cycle.duration} menit`} />
            <InfoRow label="Est. Pendapatan" value={fmtRp(rev)} />
          </CardContent>
        </Card>
      </div>

      {cycle.stages?.length > 0 && (
        <Card className="mb-3.5 overflow-hidden">
          <CardHeader className="border-b border-border py-3.5">
            <CardTitle>Log Per Tahap Separasi</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                {["Tahap", "Medium", "Densitas", "Durasi", "Fraksi Apung (kg)", "Fraksi Tenggelam (kg)"].map(
                  (h) => <TableHead key={h}>{h}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycle.stages.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-semibold text-sm text-primary">
                    {STAGES_META[i]?.label}
                  </TableCell>
                  <TableCell className="text-sm">{STAGES_META[i]?.medium}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {STAGES_META[i]?.density}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.dur} mnt</TableCell>
                  <TableCell className="font-mono text-sm">{s.floatKg} kg</TableCell>
                  <TableCell className="font-mono text-sm">{s.sinkKg} kg</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border py-3.5">
          <CardTitle>Output Resin dan Estimasi Nilai</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              {["Jenis Resin", "Berat (kg)", "Grade", "Harga Ref./kg", "Est. Nilai"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cycle.resins.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  <span
                    className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      background: (RESIN_COLORS[r.type] || "#ccc") + "22",
                      color: RESIN_COLORS[r.type] || "#666",
                    }}
                  >
                    {r.type}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">{r.kg} kg</TableCell>
                <TableCell><GradeBadge grade={r.grade} /></TableCell>
                <TableCell className="font-mono text-sm">{fmtRp(PRICE_REF[r.type] || 0)}</TableCell>
                <TableCell className="font-mono text-sm text-primary font-semibold">
                  {fmtRp(r.kg * (PRICE_REF[r.type] || 0))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="font-bold text-sm">
                Total Estimasi Pendapatan
              </TableCell>
              <TableCell className="font-mono text-sm font-bold text-primary">
                {fmtRp(rev)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
    </div>
  );
}
