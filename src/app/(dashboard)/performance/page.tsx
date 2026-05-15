"use client";
import { useRouter } from "next/navigation";
import { FileText, ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo } from "react";

// =====================
// Types LOKAL (karena src/types/index.ts belum punya ShiftLog)
// =====================
type EquipmentState = "OFF" | "IDLE" | "RUNNING" | "MAINTENANCE" | "ERROR";
type CheckMethod = "SENSOR" | "MANUAL";
type QualityGrade = "A" | "B" | "C" | "D";
type LiquidType = "ETHANOL" | "CACL2" | "CALCIUM_LIGNOSULFONATE" | "MIBC";

type TaskItem = { title: string; done?: boolean; note?: string };

type OperatorShift = {
  operatorId: string;
  fullName: string;
  shiftStartAt: string; // ISO string / string
  shiftEndAt: string; // ISO string / string
  tasks: TaskItem[]; // list
  notes: string; // catatan global untuk semuanya
};

type LiquidStockCheck = {
  liquidType: LiquidType;

  stockId: string; // id stock tiap cairan
  supplierBatchId: string; // per batch supplier

  // keputusan: total awal = awal shift
  volumeStartShiftLiters: number;

  // keputusan: before/after saat check
  volumeBeforeLiters: number;
  volumeAfterLiters: number;

  // keputusan: refill
  lastRefillLiters?: number;
  lastRefillAt?: string;

  // keputusan: metode cek + metadata
  checkMethod: CheckMethod;
  checkedAt: string;
  checkedByOperatorId?: string | null; // nullable kalau sensor

  // keputusan: kualitas per batch (A/B/C/D)
  qualityGrade: QualityGrade;
};

type EquipmentSnapshot = {
  equipmentId: string;
  equipmentType: "SHREDDER" | "DENSITY_SEPARATOR";
  name: string;
  manufacturer: string;
  capacityKgPerHour: number;

  // keputusan: status aktif state lengkap
  state: EquipmentState;

  // keputusan: runtime total + per periode (today/cycle)
  runtimeHoursTotal: number;
  runtimeMinutesToday?: number;
  runtimeMinutesCycle?: number; // cycle proses produksi

  lastServiceAt?: string;

  // keputusan: energi per hari (kWh)
  energyKwhToday: number;

  // keputusan: output per periode
  outputKgShift?: number;
  outputKgToday?: number;
  outputKgBatch?: number;

  // keputusan: cycle proses produksi
  productionCycleId?: string;
  batchId?: string;
};

type DryingReusableLog = {
  pickupLiquidId: string; // id pengambilan cairan
  operatorId: string;
  lastPickedAt: string; // terakhir diambil cairan
  state: EquipmentState; // state lengkap
  totalLiquidTakenLiters: number;

  // keputusan: kelembapan eksplisit
  humidityType: "RH" | "MOISTURE_CONTENT";
  humidityValue: number;
};

type ShiftLog = {
  shiftLogId: string;
  operator: OperatorShift;
  liquids: LiquidStockCheck[];
  shredder: EquipmentSnapshot;
  densitySeparator: EquipmentSnapshot;
  dryingReusable: DryingReusableLog;
};

// =====================
// UI Helpers
// =====================
function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function StateBadge({ state }: { state: EquipmentState }) {
  const variant =
    state === "RUNNING"
      ? "default"
      : state === "ERROR"
        ? "destructive"
        : "secondary";

  return (
    <Badge
      variant={variant as any}
      className="uppercase text-[10px] tracking-wide"
    >
      {state}
    </Badge>
  );
}

const fmtNum = (n: number, digits = 0) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);

const fmtLiters = (n: number) => `${fmtNum(n, 1)} L`;
const fmtKg = (n: number) => `${fmtNum(n, 1)} kg`;
const fmtKwh = (n: number) => `${fmtNum(n, 2)} kWh`;

// =====================
// DATA STATIS (sesuai keputusan final)
// =====================
const STATIC_SHIFT_LOG: ShiftLog = {
  shiftLogId: "SHIFT-2026-05-15-A",
  operator: {
    operatorId: "OP-001",
    fullName: "Operator Demo",
    shiftStartAt: "2026-05-15T08:00:00+07:00",
    shiftEndAt: "2026-05-15T16:00:00+07:00",
    tasks: [
      { title: "Cek volume ETHANOL (manual)", done: true },
      {
        title: "Monitoring shredder 2 jam",
        done: false,
        note: "Menunggu bahan masuk",
      },
      { title: "Kalibrasi sensor CaCl2", done: true },
    ],
    notes: "Catatan global shift: kondisi stabil, RH meningkat siang hari.",
  },
  liquids: [
    {
      liquidType: "ETHANOL",
      stockId: "STOCK-ETH-01",
      supplierBatchId: "BATCH-ETH-2026-05-10",
      volumeStartShiftLiters: 220,
      volumeBeforeLiters: 215,
      volumeAfterLiters: 214,
      lastRefillLiters: 50,
      lastRefillAt: "2026-05-15T07:30:00+07:00",
      checkMethod: "MANUAL",
      checkedAt: "2026-05-15T10:05:00+07:00",
      checkedByOperatorId: "OP-001",
      qualityGrade: "A",
    },
    {
      liquidType: "CACL2",
      stockId: "STOCK-CACL2-01",
      supplierBatchId: "BATCH-CACL2-2026-05-12",
      volumeStartShiftLiters: 180,
      volumeBeforeLiters: 178,
      volumeAfterLiters: 177.5,
      checkMethod: "SENSOR",
      checkedAt: "2026-05-15T11:20:00+07:00",
      checkedByOperatorId: null,
      qualityGrade: "B",
    },
    {
      liquidType: "CALCIUM_LIGNOSULFONATE",
      stockId: "STOCK-CLS-01",
      supplierBatchId: "BATCH-CLS-2026-05-09",
      volumeStartShiftLiters: 120,
      volumeBeforeLiters: 118,
      volumeAfterLiters: 118,
      checkMethod: "MANUAL",
      checkedAt: "2026-05-15T13:05:00+07:00",
      checkedByOperatorId: "OP-001",
      qualityGrade: "D",
    },
    {
      liquidType: "MIBC",
      stockId: "STOCK-MIBC-01",
      supplierBatchId: "BATCH-MIBC-2026-05-11",
      volumeStartShiftLiters: 90,
      volumeBeforeLiters: 89,
      volumeAfterLiters: 88.8,
      checkMethod: "MANUAL",
      checkedAt: "2026-05-15T14:10:00+07:00",
      checkedByOperatorId: "OP-001",
      qualityGrade: "A",
    },
  ],
  shredder: {
    equipmentId: "EQ-SHR-01",
    equipmentType: "SHREDDER",
    name: "Shredder A",
    manufacturer: "Pabrik X",
    capacityKgPerHour: 80,
    state: "RUNNING",
    runtimeHoursTotal: 1240.5,
    runtimeMinutesToday: 180,
    energyKwhToday: 38.2,
    outputKgShift: 210,
    outputKgToday: 310,
    productionCycleId: "CYCLE-2026-05-15-01",
    lastServiceAt: "2026-05-01T09:00:00+07:00",
  },
  densitySeparator: {
    equipmentId: "EQ-DEN-01",
    equipmentType: "DENSITY_SEPARATOR",
    name: "Density Separator 1",
    manufacturer: "Pabrik Y",
    capacityKgPerHour: 60,
    state: "IDLE",
    runtimeHoursTotal: 980.2,
    runtimeMinutesCycle: 45,
    energyKwhToday: 22.5,
    outputKgBatch: 96,
    batchId: "BATCH-PLASTIC-2026-05-15-01",
    productionCycleId: "CYCLE-2026-05-15-01",
    lastServiceAt: "2026-04-21T09:00:00+07:00",
  },
  dryingReusable: {
    pickupLiquidId: "PICK-0009",
    operatorId: "OP-001",
    lastPickedAt: "2026-05-15T14:40:00+07:00",
    state: "RUNNING",
    totalLiquidTakenLiters: 18,
    humidityType: "RH",
    humidityValue: 66,
  },
};

export default function PerformancePage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const data = STATIC_SHIFT_LOG;

  const totals = useMemo(() => {
    const totalStart = data.liquids.reduce(
      (a, x) => a + x.volumeStartShiftLiters,
      0,
    );
    const totalBefore = data.liquids.reduce(
      (a, x) => a + x.volumeBeforeLiters,
      0,
    );
    const totalAfter = data.liquids.reduce(
      (a, x) => a + x.volumeAfterLiters,
      0,
    );
    const totalRefill = data.liquids.reduce(
      (a, x) => a + (x.lastRefillLiters ?? 0),
      0,
    );
    return { totalStart, totalBefore, totalAfter, totalRefill };
  }, [data]);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const autoTable =
        (autoTableMod as any).default ||
        (autoTableMod as any).autoTable ||
        null;

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 40;
      let y = 44;

      const safe = (v: any) =>
        v === null || v === undefined || v === "" ? "-" : String(v);

      const hLine = (yy: number) => {
        doc.setDrawColor(220);
        doc.line(marginX, yy, pageW - marginX, yy);
      };

      const sectionTitle = (title: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, marginX, y);
        y += 10;
        hLine(y);
        y += 16;
      };

      const kv = (label: string, value: string) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(label, marginX, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, pageW - marginX, y, { align: "right" });
        y += 16;
      };

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Analisis Performa (Shift Log)", marginX, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`ShiftLog ID: ${safe(data.shiftLogId)}`, pageW - marginX, y, {
        align: "right",
      });
      y += 18;

      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(`Diekspor: ${new Date().toLocaleString("id-ID")}`, marginX, y);
      doc.setTextColor(0);
      y += 18;

      hLine(y);
      y += 18;

      // Operator
      sectionTitle("Informasi Operator (Shift)");
      kv("Operator ID", safe(data.operator.operatorId));
      kv("Nama", safe(data.operator.fullName));
      kv("Mulai Shift", safe(data.operator.shiftStartAt));
      kv("Selesai Shift", safe(data.operator.shiftEndAt));
      kv("Catatan Global", safe(data.operator.notes));

      y += 8;

      // Tasks table
      sectionTitle("Task Hari Ini");
      const taskHead = [["No", "Task", "Status", "Catatan"]];
      const taskBody = data.operator.tasks.map((t, i) => [
        String(i + 1),
        safe(t.title),
        t.done ? "Selesai" : "Belum",
        safe(t.note ?? "-"),
      ]);

      const taskOpt = {
        startY: y,
        head: taskHead,
        body: taskBody,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        margin: { left: marginX, right: marginX },
      };

      if (typeof autoTable === "function") autoTable(doc, taskOpt);
      else (doc as any).autoTable(taskOpt);

      y = ((doc as any).lastAutoTable?.finalY ?? y) + 18;

      // Liquids
      sectionTitle("Informasi Cairan (Per Batch)");
      kv("Total Awal Shift", fmtLiters(totals.totalStart));
      kv("Total Sebelum Cek", fmtLiters(totals.totalBefore));
      kv("Total Setelah Cek", fmtLiters(totals.totalAfter));
      kv("Total Refill", fmtLiters(totals.totalRefill));

      y += 8;

      const liqHead = [
        [
          "Cairan",
          "Stock ID",
          "Supplier Batch",
          "Awal Shift (L)",
          "Before (L)",
          "After (L)",
          "Refill (L)",
          "Metode",
          "Waktu Cek",
          "Checked By",
          "Grade",
        ],
      ];

      const liqBody = data.liquids.map((l) => [
        safe(l.liquidType),
        safe(l.stockId),
        safe(l.supplierBatchId),
        safe(l.volumeStartShiftLiters),
        safe(l.volumeBeforeLiters),
        safe(l.volumeAfterLiters),
        safe(l.lastRefillLiters ?? "-"),
        safe(l.checkMethod),
        safe(l.checkedAt),
        safe(l.checkedByOperatorId ?? "-"),
        safe(l.qualityGrade),
      ]);

      const liqOpt = {
        startY: y,
        head: liqHead,
        body: liqBody,
        theme: "grid",
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        margin: { left: marginX, right: marginX },
      };

      if (typeof autoTable === "function") autoTable(doc, liqOpt);
      else (doc as any).autoTable(liqOpt);

      y = ((doc as any).lastAutoTable?.finalY ?? y) + 18;

      // Equipment (ringkas)
      sectionTitle("Informasi Alat (Snapshot)");
      const eqKV = (label: string, value: string) => kv(label, value);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Shredder", marginX, y);
      y += 14;
      eqKV("State", data.shredder.state);
      eqKV("Hour Meter", `${fmtNum(data.shredder.runtimeHoursTotal, 1)} jam`);
      eqKV(
        "Runtime Today",
        data.shredder.runtimeMinutesToday !== undefined
          ? `${data.shredder.runtimeMinutesToday} menit`
          : "-",
      );
      eqKV("Energy Today", fmtKwh(data.shredder.energyKwhToday));
      eqKV(
        "Output Shift",
        data.shredder.outputKgShift !== undefined
          ? fmtKg(data.shredder.outputKgShift)
          : "-",
      );
      eqKV(
        "Output Today",
        data.shredder.outputKgToday !== undefined
          ? fmtKg(data.shredder.outputKgToday)
          : "-",
      );
      eqKV("Production Cycle ID", safe(data.shredder.productionCycleId ?? "-"));

      y += 8;
      hLine(y);
      y += 18;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Density Separator", marginX, y);
      y += 14;
      eqKV("State", data.densitySeparator.state);
      eqKV(
        "Hour Meter",
        `${fmtNum(data.densitySeparator.runtimeHoursTotal, 1)} jam`,
      );
      eqKV(
        "Runtime Cycle",
        data.densitySeparator.runtimeMinutesCycle !== undefined
          ? `${data.densitySeparator.runtimeMinutesCycle} menit`
          : "-",
      );
      eqKV("Energy Today", fmtKwh(data.densitySeparator.energyKwhToday));
      eqKV(
        "Output Batch",
        data.densitySeparator.outputKgBatch !== undefined
          ? fmtKg(data.densitySeparator.outputKgBatch)
          : "-",
      );
      eqKV("Batch ID", safe(data.densitySeparator.batchId ?? "-"));
      eqKV(
        "Production Cycle ID",
        safe(data.densitySeparator.productionCycleId ?? "-"),
      );

      // Drying/Reusable
      sectionTitle("Pengeringan & Reusable Cairan");
      kv("Pickup Liquid ID", safe(data.dryingReusable.pickupLiquidId));
      kv("Operator ID", safe(data.dryingReusable.operatorId));
      kv("Terakhir Diambil", safe(data.dryingReusable.lastPickedAt));
      kv("State", safe(data.dryingReusable.state));
      kv(
        "Total Cairan Diambil",
        fmtLiters(data.dryingReusable.totalLiquidTakenLiters),
      );
      kv(
        "Kelembapan",
        data.dryingReusable.humidityType === "RH"
          ? `${safe(data.dryingReusable.humidityValue)}% RH`
          : `${safe(data.dryingReusable.humidityValue)}% (Moisture)`,
      );

      // Footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        "ResinSep — Shift Performance Report (Static)",
        marginX,
        pageH - 24,
      );
      doc.setTextColor(0);

      doc.save(`shift-${safe(data.shiftLogId)}.pdf`);
    } catch (err) {
      console.error("Gagal ekspor PDF:", err);
      alert("Gagal mengekspor PDF. Coba lagi.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">
          Analisis Performa (Shift)
        </h1>

        <span className="font-mono text-xs text-primary bg-accent px-3 py-1 rounded-md">
          {data.shiftLogId}
        </span>

        <div className="ml-auto">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Mengekspor...
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Operator + Ringkasan Cairan */}
      <div className="grid grid-cols-2 gap-3.5 mb-3.5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Informasi Operator (Shift)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Operator ID"
              value={data.operator.operatorId}
              mono
            />
            <InfoRow label="Nama Lengkap" value={data.operator.fullName} />
            <InfoRow
              label="Mulai Shift"
              value={data.operator.shiftStartAt}
              mono
            />
            <InfoRow
              label="Selesai Shift"
              value={data.operator.shiftEndAt}
              mono
            />
            <InfoRow label="Catatan Global" value={data.operator.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Ringkasan Cairan (Liter)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Total Awal Shift"
              value={fmtLiters(totals.totalStart)}
            />
            <InfoRow
              label="Total Sebelum Cek"
              value={fmtLiters(totals.totalBefore)}
            />
            <InfoRow
              label="Total Setelah Cek"
              value={fmtLiters(totals.totalAfter)}
            />
            <InfoRow
              label="Total Refill"
              value={fmtLiters(totals.totalRefill)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tasks */}
      <Card className="mb-3.5 overflow-hidden">
        <CardHeader className="border-b border-border py-3.5">
          <CardTitle>Task Hari Ini (List)</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              {["No", "Task", "Status", "Catatan"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.operator.tasks.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-sm">{i + 1}</TableCell>
                <TableCell className="text-sm">{t.title}</TableCell>
                <TableCell className="text-sm">
                  <Badge variant={(t.done ? "default" : "secondary") as any}>
                    {t.done ? "Selesai" : "Belum"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.note ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Liquids */}
      <Card className="mb-3.5 overflow-hidden">
        <CardHeader className="border-b border-border py-3.5">
          <CardTitle>Informasi Cairan (Per Batch Supplier)</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Cairan",
                "Stock ID",
                "Supplier Batch",
                "Awal Shift",
                "Before",
                "After",
                "Refill",
                "Metode",
                "Waktu Cek",
                "Checked By",
                "Grade",
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.liquids.map((l, i) => (
              <TableRow key={i}>
                <TableCell className="font-semibold text-sm text-primary">
                  {l.liquidType}
                </TableCell>
                <TableCell className="font-mono text-[11px]">
                  {l.stockId}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground">
                  {l.supplierBatchId}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {fmtLiters(l.volumeStartShiftLiters)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {fmtLiters(l.volumeBeforeLiters)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {fmtLiters(l.volumeAfterLiters)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {l.lastRefillLiters !== undefined
                    ? fmtLiters(l.lastRefillLiters)
                    : "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      (l.checkMethod === "SENSOR"
                        ? "secondary"
                        : "outline") as any
                    }
                  >
                    {l.checkMethod}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-[11px]">
                  {l.checkedAt}
                </TableCell>
                <TableCell className="font-mono text-[11px]">
                  {l.checkedByOperatorId ?? "-"}
                </TableCell>
                <TableCell>
                  {/* BUKAN GradeBadge karena ResinGrade di index.ts hanya A|B|C */}
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {l.qualityGrade}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Equipment */}
      <div className="grid grid-cols-2 gap-3.5 mb-3.5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Shredder</CardTitle>
            <StateBadge state={data.shredder.state} />
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Equipment ID"
              value={data.shredder.equipmentId}
              mono
            />
            <InfoRow label="Nama" value={data.shredder.name} />
            <InfoRow label="Pabrik" value={data.shredder.manufacturer} />
            <InfoRow
              label="Kapasitas"
              value={`${data.shredder.capacityKgPerHour} kg/jam`}
            />
            <InfoRow
              label="Hour Meter (Total)"
              value={`${fmtNum(data.shredder.runtimeHoursTotal, 1)} jam`}
            />
            <InfoRow
              label="Runtime Today"
              value={
                data.shredder.runtimeMinutesToday !== undefined
                  ? `${data.shredder.runtimeMinutesToday} menit`
                  : "-"
              }
            />
            <InfoRow
              label="Energy Today"
              value={fmtKwh(data.shredder.energyKwhToday)}
            />
            <InfoRow
              label="Output Shift"
              value={
                data.shredder.outputKgShift !== undefined
                  ? fmtKg(data.shredder.outputKgShift)
                  : "-"
              }
            />
            <InfoRow
              label="Output Today"
              value={
                data.shredder.outputKgToday !== undefined
                  ? fmtKg(data.shredder.outputKgToday)
                  : "-"
              }
            />
            <InfoRow
              label="Production Cycle ID"
              value={data.shredder.productionCycleId ?? "-"}
              mono
            />
            <InfoRow
              label="Terakhir Servis"
              value={data.shredder.lastServiceAt ?? "-"}
              mono
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Density Separator</CardTitle>
            <StateBadge state={data.densitySeparator.state} />
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Equipment ID"
              value={data.densitySeparator.equipmentId}
              mono
            />
            <InfoRow label="Nama" value={data.densitySeparator.name} />
            <InfoRow
              label="Pabrik"
              value={data.densitySeparator.manufacturer}
            />
            <InfoRow
              label="Kapasitas"
              value={`${data.densitySeparator.capacityKgPerHour} kg/jam`}
            />
            <InfoRow
              label="Hour Meter (Total)"
              value={`${fmtNum(data.densitySeparator.runtimeHoursTotal, 1)} jam`}
            />
            <InfoRow
              label="Runtime Cycle"
              value={
                data.densitySeparator.runtimeMinutesCycle !== undefined
                  ? `${data.densitySeparator.runtimeMinutesCycle} menit`
                  : "-"
              }
            />
            <InfoRow
              label="Energy Today"
              value={fmtKwh(data.densitySeparator.energyKwhToday)}
            />
            <InfoRow
              label="Output Batch"
              value={
                data.densitySeparator.outputKgBatch !== undefined
                  ? fmtKg(data.densitySeparator.outputKgBatch)
                  : "-"
              }
            />
            <InfoRow
              label="Batch ID"
              value={data.densitySeparator.batchId ?? "-"}
              mono
            />
            <InfoRow
              label="Production Cycle ID"
              value={data.densitySeparator.productionCycleId ?? "-"}
              mono
            />
            <InfoRow
              label="Terakhir Servis"
              value={data.densitySeparator.lastServiceAt ?? "-"}
              mono
            />
          </CardContent>
        </Card>
      </div>

      {/* Drying & Reusable */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border py-3.5 flex flex-row items-center justify-between">
          <CardTitle>Pengeringan & Reusable Cairan</CardTitle>
          <StateBadge state={data.dryingReusable.state} />
        </CardHeader>
        <CardContent>
          <InfoRow
            label="Pickup Liquid ID"
            value={data.dryingReusable.pickupLiquidId}
            mono
          />
          <InfoRow
            label="Operator ID"
            value={data.dryingReusable.operatorId}
            mono
          />
          <InfoRow
            label="Terakhir Diambil"
            value={data.dryingReusable.lastPickedAt}
            mono
          />
          <InfoRow
            label="Total Cairan Diambil"
            value={fmtLiters(data.dryingReusable.totalLiquidTakenLiters)}
          />
          <InfoRow
            label="Kondisi Kelembapan"
            value={
              data.dryingReusable.humidityType === "RH"
                ? `${data.dryingReusable.humidityValue}% RH`
                : `${data.dryingReusable.humidityValue}% (Moisture)`
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
