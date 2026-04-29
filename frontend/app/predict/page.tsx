"use client";

import { useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  Brain,
  Sparkles,
  Trees,
  User,
  UserPlus,
  Package,
  MapPin,
  Info,
} from "lucide-react";
import { usePrediction } from "@/hooks/use-prediction";
import { useStaticData } from "@/hooks/use-static-data";
import { useDecisionLogStore } from "@/stores/decision-log-store";
import { DEFAULT_THRESHOLD } from "@/lib/constants";
import { RiskGauge } from "@/components/prediction/risk-gauge";
import { ThresholdSlider } from "@/components/prediction/threshold-slider";
import { ThresholdExplainer } from "@/components/prediction/threshold-explainer";
import { ComparisonTable } from "@/components/prediction/comparison-table";
import { RecommendationCard } from "@/components/prediction/recommendation-card";
import { ShapWaterfall } from "@/components/prediction/shap-waterfall";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { riskLabel } from "@/lib/threshold-utils";
import type {
  PredictionInput,
  PredictionResult,
  UniqueValues,
  FieldHierarchy,
} from "@/types/prediction";

export default function PredictPage() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const predict = usePrediction();
  const addEntry = useDecisionLogStore((s) => s.addEntry);

  const { data: uniqueValues } = useStaticData<UniqueValues>(
    "unique-values",
    "/api/config/unique-values",
  );
  const { data: hierarchy } = useStaticData<FieldHierarchy>(
    "field-hierarchy",
    "/api/config/field-hierarchy",
  );

  const [form, setForm] = useState<PredictionInput>({
    jumlah: 0,
    kode_customer: "",
    nama_salesman: "",
    nama_divisi: "",
    nama_kategori: "",
    nama_sub_kategori: "",
    kode_cabang: "",
    provinsi: "",
    kota: "",
    kecamatan: "",
    nama_group_customer: "",
    keterangan: "No Remark",
  });

  /* ─── Hierarchical option getters ─── */

  const provinsiOptions = useMemo(
    () => hierarchy?.all_provinsi ?? uniqueValues?.provinsi ?? [],
    [hierarchy, uniqueValues],
  );

  const divisiOptions = useMemo(
    () => hierarchy?.all_divisi ?? uniqueValues?.nama_divisi ?? [],
    [hierarchy, uniqueValues],
  );

  const kotaOptions = useMemo(() => {
    if (!form.provinsi) return [];
    return hierarchy?.provinsi_to_kota[form.provinsi] ?? [];
  }, [form.provinsi, hierarchy]);

  const kecamatanOptions = useMemo(() => {
    if (!form.kota) return [];
    return hierarchy?.kota_to_kecamatan[form.kota] ?? [];
  }, [form.kota, hierarchy]);

  const cabangOptions = useMemo(() => {
    if (!form.kota) return [];
    return hierarchy?.kota_to_cabang[form.kota] ?? [];
  }, [form.kota, hierarchy]);

  const salesmanOptions = useMemo(() => {
    if (!form.kode_cabang) return hierarchy?.all_salesman ?? [];
    return hierarchy?.cabang_to_salesman[form.kode_cabang] ?? [];
  }, [form.kode_cabang, hierarchy]);

  const kategoriOptions = useMemo(() => {
    if (!form.nama_divisi) return [];
    return hierarchy?.divisi_to_kategori[form.nama_divisi] ?? [];
  }, [form.nama_divisi, hierarchy]);

  const subKategoriOptions = useMemo(() => {
    if (!form.nama_kategori) return [];
    return hierarchy?.kategori_to_sub_kategori[form.nama_kategori] ?? [];
  }, [form.nama_kategori, hierarchy]);

  const customerOptions = useMemo(
    () =>
      (uniqueValues?.kode_customer ?? [])
        .filter((v) => v.length > 0)
        .sort((a, b) => a.localeCompare(b, "id")),
    [uniqueValues],
  );

  const groupCustomerOptions = useMemo(
    () =>
      (uniqueValues?.nama_group_customer ?? [])
        .filter((v) => v.length > 0)
        .sort((a, b) => a.localeCompare(b, "id")),
    [uniqueValues],
  );

  /* ─── Field updaters with cascading reset ─── */

  const updateField = useCallback(
    (key: keyof PredictionInput, value: string | number) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };

        // Cascading resets for location hierarchy
        if (key === "provinsi") {
          next.kota = "";
          next.kecamatan = "";
          next.kode_cabang = "";
          // also reset salesman when branch changes
          next.nama_salesman = "";
        } else if (key === "kota") {
          next.kecamatan = "";
          next.kode_cabang = "";
          next.nama_salesman = "";
        } else if (key === "kode_cabang") {
          next.nama_salesman = "";
        }

        // Cascading resets for product hierarchy
        if (key === "nama_divisi") {
          next.nama_kategori = "";
          next.nama_sub_kategori = "";
        } else if (key === "nama_kategori") {
          next.nama_sub_kategori = "";
        }

        return next;
      });
    },
    [],
  );

  const handleToggleNewCustomer = useCallback((isNew: boolean) => {
    setIsNewCustomer(isNew);
    if (isNew) {
      setForm((prev) => ({ ...prev, kode_customer: "" }));
    }
  }, []);

  /* ─── Submit ─── */

  const handlePredict = async () => {
    try {
      const payload: PredictionInput = {
        ...form,
        kode_customer: isNewCustomer ? "" : (form.kode_customer ?? ""),
        nama_salesman: form.nama_salesman || "",
        nama_group_customer: form.nama_group_customer || "NON-GROUP CUSTOMER",
      };
      const res = await predict.mutateAsync(payload);
      setResult(res);
      addEntry({
        id: res.prediction_id,
        timestamp: res.timestamp,
        jumlah: form.jumlah,
        kode_customer: isNewCustomer
          ? "(Pelanggan Baru)"
          : (form.kode_customer ?? ""),
        xgb_probability: res.xgboost.probability,
        mlp_probability: res.mlp.probability,
        threshold,
        xgb_label: riskLabel(res.xgboost.probability, threshold),
        mlp_label: riskLabel(res.mlp.probability, threshold),
      });
    } catch {
      // error handled by TanStack Query
    }
  };

  /* ─── Validation ─── */

  const REQUIRED_FIELDS: (keyof PredictionInput)[] = [
    "nama_divisi",
    "nama_kategori",
    "nama_sub_kategori",
    "provinsi",
    "kota",
    "kecamatan",
    "kode_cabang",
  ];

  const filledCount =
    (form.jumlah > 0 ? 1 : 0) +
    REQUIRED_FIELDS.filter(
      (f) => ((form[f] as string) ?? "").trim().length > 0,
    ).length +
    (!isNewCustomer && (form.kode_customer ?? "").trim().length > 0 ? 1 : 0);

  const totalRequired =
    1 + REQUIRED_FIELDS.length + (isNewCustomer ? 0 : 1);

  const canSubmit =
    form.jumlah > 0 &&
    REQUIRED_FIELDS.every(
      (f) => ((form[f] as string) ?? "").trim().length > 0,
    ) &&
    (isNewCustomer || (form.kode_customer ?? "").trim().length > 0);

  const completionPercent = Math.round((filledCount / totalRequired) * 100);

  return (
    <div className="page-shell space-y-6 pb-8">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1>Prediksi risiko kredit</h1>
            <p className="max-w-[68ch] text-muted-foreground mt-1">
              Input data transaksi baru untuk mendapatkan prediksi risiko
              keterlambatan pembayaran.
            </p>
          </div>
          {/* Progress indicator */}
          <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm backdrop-blur">
            <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
              Kesiapan Form
            </p>
            <p className="text-foreground font-semibold mt-0.5">
              {filledCount}/{totalRequired} field terisi
            </p>
            <div className="mt-2 h-2 w-44 rounded-full bg-muted overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${completionPercent}%`,
                  background:
                    completionPercent === 100
                      ? "#22c55e"
                      : completionPercent > 50
                        ? "var(--primary)"
                        : "#f59e0b",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[450px_1fr]">
        {/* Left: Input form */}
        <div className="space-y-4">
          <Card className="surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Input transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                {/* Jumlah */}
                <div>
                  <label htmlFor="jumlah" className="text-sm font-medium">
                    Jumlah (Rp)
                  </label>
                  <input
                    id="jumlah"
                    type="number"
                    value={form.jumlah || ""}
                    onChange={(e) =>
                      updateField("jumlah", Number(e.target.value))
                    }
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-shadow focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="15000000"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Masukkan nominal transaksi aktual untuk evaluasi model.
                  </p>
                </div>

                {/* New/Existing Customer Toggle */}
                <div className="form-group">
                  <div className="form-group-label">
                    <User className="h-3.5 w-3.5" />
                    Informasi Pelanggan
                  </div>

                  {/* Toggle buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleNewCustomer(false)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        !isNewCustomer
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <User className="h-4 w-4" />
                      Pelanggan Lama
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleNewCustomer(true)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        isNewCustomer
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <UserPlus className="h-4 w-4" />
                      Pelanggan Baru
                    </button>
                  </div>

                  {isNewCustomer ? (
                    <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-50/60 px-3 py-2.5 text-xs text-blue-900 dark:bg-blue-950/20 dark:text-blue-200 flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        Prediksi untuk pelanggan baru menggunakan rata-rata
                        historis industri. Hasil prediksi didasarkan pada
                        karakteristik transaksi (lokasi, produk, nominal).
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Kode Customer *
                        </label>
                        <Select
                          value={form.kode_customer ?? ""}
                          onValueChange={(v) =>
                            updateField("kode_customer", v)
                          }
                        >
                          <SelectTrigger className="mt-1 w-full">
                            <SelectValue placeholder="Pilih Customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customerOptions.map((val) => (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Group Customer
                        </label>
                        <Select
                          value={form.nama_group_customer ?? ""}
                          onValueChange={(v) =>
                            updateField("nama_group_customer", v)
                          }
                        >
                          <SelectTrigger className="mt-1 w-full">
                            <SelectValue placeholder="Opsional" />
                          </SelectTrigger>
                          <SelectContent>
                            {groupCustomerOptions.map((val) => (
                              <SelectItem key={val} value={val}>
                                {val}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Location hierarchy */}
                <div className="form-group">
                  <div className="form-group-label">
                    <MapPin className="h-3.5 w-3.5" />
                    Lokasi
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Provinsi — root of location hierarchy */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Provinsi *
                      </label>
                      <Select
                        value={form.provinsi}
                        onValueChange={(v) => updateField("provinsi", v)}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Pilih Provinsi" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinsiOptions.map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Kota — filtered by Provinsi */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Kota/Kabupaten *
                      </label>
                      <Select
                        value={form.kota}
                        onValueChange={(v) => updateField("kota", v)}
                        disabled={!form.provinsi}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue
                            placeholder={
                              form.provinsi
                                ? "Pilih Kota"
                                : "Pilih Provinsi dulu"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {kotaOptions.map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Kecamatan — filtered by Kota */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Kecamatan *
                      </label>
                      <Select
                        value={form.kecamatan}
                        onValueChange={(v) => updateField("kecamatan", v)}
                        disabled={!form.kota}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue
                            placeholder={
                              form.kota
                                ? "Pilih Kecamatan"
                                : "Pilih Kota dulu"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {kecamatanOptions.map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cabang — filtered by Kota */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Cabang *
                      </label>
                      <Select
                        value={form.kode_cabang}
                        onValueChange={(v) => updateField("kode_cabang", v)}
                        disabled={!form.kota}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue
                            placeholder={
                              form.kota
                                ? "Pilih Cabang"
                                : "Pilih Kota dulu"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {cabangOptions.map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Product hierarchy */}
                <div className="form-group">
                  <div className="form-group-label">
                    <Package className="h-3.5 w-3.5" />
                    Informasi Produk
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Divisi — root of product hierarchy */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Divisi *
                      </label>
                      <Select
                        value={form.nama_divisi}
                        onValueChange={(v) => updateField("nama_divisi", v)}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Pilih Divisi" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisiOptions.map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Kategori — filtered by Divisi */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Kategori *
                      </label>
                      <Select
                        value={form.nama_kategori}
                        onValueChange={(v) => updateField("nama_kategori", v)}
                        disabled={!form.nama_divisi}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue
                            placeholder={
                              form.nama_divisi
                                ? "Pilih Kategori"
                                : "Pilih Divisi dulu"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {kategoriOptions.map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sub Kategori — filtered by Kategori */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Sub Kategori *
                      </label>
                      <Select
                        value={form.nama_sub_kategori}
                        onValueChange={(v) =>
                          updateField("nama_sub_kategori", v)
                        }
                        disabled={!form.nama_kategori}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue
                            placeholder={
                              form.nama_kategori
                                ? "Pilih Sub Kategori"
                                : "Pilih Kategori dulu"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {subKategoriOptions.map((val) => (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Salesman (optional) */}
                <div className="form-group">
                  <div className="form-group-label">
                    <User className="h-3.5 w-3.5" />
                    Salesman
                    <span className="ml-1 text-muted-foreground font-normal">(opsional)</span>
                  </div>
                  <div>
                    <Select
                      value={form.nama_salesman ?? ""}
                      onValueChange={(v) => updateField("nama_salesman", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            form.kode_cabang
                              ? "Pilih Salesman (opsional)"
                              : "Pilih Cabang dulu untuk filter salesman"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {salesmanOptions.map((val) => (
                          <SelectItem key={val} value={val}>
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Jika tidak diisi, prediksi menggunakan rata-rata performa salesman.
                    </p>
                  </div>
                </div>

                {/* Keterangan */}
                <div>
                  <label htmlFor="keterangan" className="text-sm font-medium">
                    Keterangan
                  </label>
                  <input
                    id="keterangan"
                    type="text"
                    value={form.keterangan}
                    onChange={(e) => updateField("keterangan", e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-shadow focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {!canSubmit && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-50/60 px-3 py-2.5 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Lengkapi semua field wajib (*) dan isi jumlah transaksi
                      lebih dari 0 sebelum menjalankan prediksi.
                    </span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <ThresholdSlider value={threshold} onChange={setThreshold} />
          <ThresholdExplainer />

          <Button
            onClick={handlePredict}
            disabled={predict.isPending || !canSubmit}
            className="w-full"
            size="lg"
          >
            {predict.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memproses prediksi...
              </span>
            ) : (
              "Jalankan prediksi"
            )}
          </Button>

          {predict.isError && (
            <Card className="border-destructive/40">
              <CardContent className="pt-6 text-sm text-destructive">
                <p>Gagal memproses permintaan.</p>
                <p className="text-xs mt-1">{predict.error.message}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {!result ? (
            <Card className="surface-card flex min-h-[420px] items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                {predict.isPending ? (
                  <div className="skeleton-page w-full max-w-md mx-auto">
                    <div className="skeleton skeleton-header mx-auto" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="skeleton h-48 rounded-xl" />
                      <div className="skeleton h-48 rounded-xl" />
                    </div>
                    <div className="skeleton h-32 rounded-xl" />
                    <div className="skeleton h-24 rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
                      <Sparkles className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="text-2xl font-semibold text-foreground">
                      Analisis siap dijalankan
                    </p>
                    <p>Hasil prediksi akan muncul di panel ini</p>
                    <p className="text-xs">
                      Isi form di sebelah kiri dan klik &quot;Jalankan
                      Prediksi&quot;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 stagger-children">
              {/* New Customer badge */}
              {isNewCustomer && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-50/60 px-3 py-2.5 text-sm text-blue-900 dark:bg-blue-950/20 dark:text-blue-200 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    Prediksi ini untuk pelanggan baru — menggunakan rata-rata
                    historis industri sebagai baseline.
                  </span>
                </div>
              )}

              {/* Gauges */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="surface-card">
                  <CardHeader className="pb-0">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
                        <Trees className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <span className="text-muted-foreground">XGBoost</span>
                      <span
                        className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                          result.xgboost.probability >= threshold
                            ? "risk-badge-high"
                            : "risk-badge-low"
                        }`}
                      >
                        {result.xgboost.probability >= threshold
                          ? "Berisiko"
                          : "Layak"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 flex justify-center">
                    <RiskGauge
                      probability={result.xgboost.probability}
                      threshold={threshold}
                      modelName="XGBoost"
                    />
                  </CardContent>
                </Card>
                <Card className="surface-card">
                  <CardHeader className="pb-0">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10">
                        <Brain className="h-3.5 w-3.5 text-rose-500" />
                      </div>
                      <span className="text-muted-foreground">MLP</span>
                      <span
                        className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                          result.mlp.probability >= threshold
                            ? "risk-badge-high"
                            : "risk-badge-low"
                        }`}
                      >
                        {result.mlp.probability >= threshold
                          ? "Berisiko"
                          : "Layak"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 flex justify-center">
                    <RiskGauge
                      probability={result.mlp.probability}
                      threshold={threshold}
                      modelName="MLP"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Comparison */}
              <Card className="surface-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Perbandingan Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ComparisonTable
                    xgbProb={result.xgboost.probability}
                    mlpProb={result.mlp.probability}
                    threshold={threshold}
                  />
                </CardContent>
              </Card>

              {/* Recommendation */}
              <RecommendationCard
                xgbProb={result.xgboost.probability}
                mlpProb={result.mlp.probability}
                threshold={threshold}
              />

              {/* SHAP */}
              {result.shap_explanation?.xgboost && (
                <Card className="surface-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      SHAP feature contributions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ShapWaterfall
                      baseValue={result.shap_explanation.xgboost.base_value}
                      features={result.shap_explanation.xgboost.top_features}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
