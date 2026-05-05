"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { addCycle, getCycles, genCycleId } from "@/lib/firestore";
import {
  SUPPLIERS,
  RESIN_TYPES,
  STAGES_META,
  PRICE_REF,
  type ResinGrade,
  type Resin,
  type Stage,
} from "@/types";
import { fmtRp } from "@/lib/utils";
import { TopBar } from "@/components/topbar";
import { GradeBadge } from "@/components/grade-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OutputResin {
  type: string;
  kg: string;
  grade: ResinGrade;
}

const STEP_LABELS = ["Input dan Sumber", "Monitor Proses", "Output dan Grading"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-7">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done = current > step;
        const active = current === step;
        return (
          <div key={label} className="flex items-center" style={{ flex: i < STEP_LABELS.length - 1 ? 1 : "auto" }}>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : step}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  active ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`flex-1 h-px mx-3 transition-colors ${
                  done ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NewCyclePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [supplier, setSupplier] = useState("");
  const [inputKg, setInputKg] = useState("");
  const [selectedResins, setSelectedResins] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [cycleId] = useState(() => {
    const d = new Date();
    const key = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `RSP-${key}-001`;
  });

  const [stageData, setStageData] = useState<Stage[]>(
    STAGES_META.map(() => ({ dur: 0, floatKg: 0, sinkKg: 0 }))
  );

  const [outputResins, setOutputResins] = useState<OutputResin[]>([
    { type: "PET", kg: "", grade: "A" },
  ]);

  const [saving, setSaving] = useState(false);

  const toggleResin = (r: string) =>
    setSelectedResins((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );

  const updateStage = (i: number, key: keyof Stage, val: string) => {
    setStageData((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: parseFloat(val) || 0 };
      return next;
    });
  };

  const updateOutputResin = (i: number, patch: Partial<OutputResin>) => {
    setOutputResins((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const totalOutput = outputResins.reduce((s, r) => s + (parseFloat(r.kg) || 0), 0);
  const recRate = inputKg ? ((totalOutput / parseFloat(inputKg)) * 100).toFixed(1) : "0.0";
  const estRev = outputResins.reduce(
    (s, r) => s + (parseFloat(r.kg) || 0) * (PRICE_REF[r.type] || 0),
    0
  );

  const handleSave = async () => {
    if (!user) return;
    if (outputResins.some((r) => !r.kg)) {
      toast.error("Lengkapi berat semua resin output");
      return;
    }
    setSaving(true);
    try {
      const existingCycles = await getCycles(user.uid);
      const id = genCycleId(existingCycles.map((c) => c.id));
      const duration = stageData.reduce((s, d) => s + d.dur, 0);
      const outputKg = outputResins.reduce((s, r) => s + (parseFloat(r.kg) || 0), 0);
      const ts = new Date().toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      await addCycle(user.uid, {
        id,
        ts,
        supplier,
        inputKg: parseFloat(inputKg),
        outputKg,
        duration,
        notes,
        resins: outputResins.map((r) => ({
          type: r.type,
          kg: parseFloat(r.kg) || 0,
          grade: r.grade,
        })),
        stages: stageData,
      });

      toast.success("Siklus berhasil disimpan");
      router.push("/cycles");
    } catch {
      toast.error("Gagal menyimpan siklus");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <TopBar title="Siklus Baru" sub="Log batch separasi resin baru" />
      <StepIndicator current={step} />

      {step === 1 && (
        <div className="grid grid-cols-[1fr_280px] gap-4">
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1.5">CYCLE ID (otomatis)</p>
                <span className="inline-block font-mono text-sm font-semibold text-primary bg-accent px-3 py-1.5 rounded-md">
                  {cycleId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Sumber / Supplier *</Label>
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih sumber..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIERS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Berat Input (kg) *</Label>
                  <Input
                    type="number"
                    value={inputKg}
                    onChange={(e) => setInputKg(e.target.value)}
                    placeholder="contoh: 150"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Jenis Plastik Diketahui (opsional)</Label>
                <div className="flex flex-wrap gap-2">
                  {[...RESIN_TYPES, "Campuran"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleResin(r)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedResins.includes(r)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Catatan (opsional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Kondisi khusus, anomali, dsb..."
                  rows={3}
                />
              </div>

              <Button
                onClick={() => {
                  if (!supplier || !inputKg) {
                    toast.error("Lengkapi sumber dan berat input");
                    return;
                  }
                  setStep(2);
                }}
              >
                Mulai Siklus
              </Button>
            </CardContent>
          </Card>

          <Card className="self-start">
            <CardHeader>
              <CardTitle>Yang Akan Direkam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {[
                ["Cycle ID", cycleId, true],
                ["Sumber", supplier || "-", false],
                ["Berat Input", inputKg ? inputKg + " kg" : "-", false],
                ["Operator", user?.displayName ?? user?.email ?? "Operator", false],
              ].map(([k, v, mono]) => (
                <div
                  key={String(k)}
                  className="flex justify-between py-2 border-b border-border last:border-0 text-sm"
                >
                  <span className="text-muted-foreground">{String(k)}</span>
                  <span className={mono ? "font-mono text-[10px] text-foreground font-medium" : "font-medium"}>
                    {String(v)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
            {STAGES_META.map((s, i) => (
              <Card
                key={i}
                className="min-w-[190px] flex-1 border-t-2"
                style={{ borderTopColor: "var(--primary)" }}
              >
                <CardContent className="pt-4 pb-4">
                  <p className="text-[10px] font-bold text-primary mb-0.5">{s.label}</p>
                  <p className="text-sm font-semibold mb-0.5">{s.medium}</p>
                  <p className="text-[10px] text-muted-foreground mb-2">rho = {s.density}</p>
                  <div className="text-[10px] mb-3">
                    <p className="text-primary mb-0.5">Apung: {s.float}</p>
                    <p className="text-destructive">Tenggelam: {s.sink}</p>
                  </div>
                  {(
                    [
                      ["Durasi (mnt)", "dur"],
                      ["Fraksi Apung (kg)", "floatKg"],
                      ["Fraksi Tenggelam (kg)", "sinkKg"],
                    ] as [string, keyof Stage][]
                  ).map(([lbl, key]) => (
                    <div key={key} className="mb-2">
                      <p className="text-[9px] text-muted-foreground mb-1">{lbl}</p>
                      <Input
                        type="number"
                        value={stageData[i][key] || ""}
                        onChange={(e) => updateStage(i, key, e.target.value)}
                        placeholder="0"
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          <Button onClick={() => setStep(3)}>Selesaikan Proses - Input Output</Button>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-[1fr_260px] gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Output per Resin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {outputResins.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2.5 items-end">
                  <div className="space-y-1.5">
                    <Label>Jenis Resin</Label>
                    <Select
                      value={r.type}
                      onValueChange={(v) => updateOutputResin(i, { type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESIN_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Berat (kg)</Label>
                    <Input
                      type="number"
                      value={r.kg}
                      onChange={(e) => updateOutputResin(i, { kg: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Grade</Label>
                    <div className="flex gap-1">
                      {(["A", "B", "C"] as ResinGrade[]).map((g) => {
                        const styles: Record<ResinGrade, { bg: string; color: string }> = {
                          A: { bg: "#D4F0E0", color: "#1A6B3A" },
                          B: { bg: "#FFF0D4", color: "#9A6000" },
                          C: { bg: "#FCE4E4", color: "#B33A3A" },
                        };
                        const s = styles[g];
                        const active = r.grade === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => updateOutputResin(i, { grade: g })}
                            className="h-9 w-9 rounded-md text-xs font-bold border transition-all"
                            style={
                              active
                                ? { background: s.bg, color: s.color, borderColor: s.color }
                                : {}
                            }
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOutputResins((p) => p.filter((_, j) => j !== i))}
                    className="h-9 w-9 flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setOutputResins((p) => [...p, { type: "PP", kg: "", grade: "A" }])
                }
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Resin
              </button>

              <div className="mt-2 p-4 bg-accent rounded-lg grid grid-cols-3 gap-4">
                {[
                  ["Total Output", `${totalOutput} kg`],
                  ["Recovery Rate", `${recRate}%`],
                  ["Est. Pendapatan", fmtRp(estRev)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">{k}</p>
                    <p className="font-mono font-bold text-primary text-sm">{v}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan dan Buat Laporan"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="self-start">
            <CardHeader>
              <CardTitle>Panduan Grade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  g: "A",
                  desc: "Bersih, kontaminasi minimal, siap jual ke pabrik premium",
                  bg: "#D4F0E0",
                  color: "#1A6B3A",
                },
                {
                  g: "B",
                  desc: "Kontaminasi ringan, dapat dijual ke agregator",
                  bg: "#FFF0D4",
                  color: "#9A6000",
                },
                {
                  g: "C",
                  desc: "Campuran atau terdegradasi, nilai jual rendah, perlu sortir ulang",
                  bg: "#FCE4E4",
                  color: "#B33A3A",
                },
              ].map(({ g, desc, bg, color }) => (
                <div key={g} className="rounded-lg p-3" style={{ background: bg }}>
                  <p className="font-bold text-xs mb-0.5" style={{ color }}>
                    Grade {g}
                  </p>
                  <p className="text-[11px]" style={{ color, opacity: 0.8 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
