"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NAV_ITEMS } from "@/lib/constants";
import { fmtNumber } from "@/lib/formatters";
import { ArrowRight, Database, Users, AlertTriangle, Cpu, ChevronRight, Trees, Brain } from "lucide-react";

const STATS = [
  {
    label: "Total Transaksi",
    value: 6357,
    icon: Database,
    color: "text-blue-500",
    cardClass: "stat-card-blue",
  },
  {
    label: "Unique Customers",
    value: 2016,
    icon: Users,
    color: "text-green-500",
    cardClass: "stat-card-green",
  },
  {
    label: "Late Payment Rate",
    value: "~32%",
    icon: AlertTriangle,
    color: "text-amber-500",
    cardClass: "stat-card-amber",
  },
  {
    label: "Fitur yang Digunakan",
    value: 69,
    icon: Cpu,
    color: "text-purple-500",
    cardClass: "stat-card-purple",
  },
];

const STEPS = [
  { step: "1", title: "Input", desc: "Masukkan data transaksi", color: "bg-blue-500" },
  {
    step: "2",
    title: "Feature Engineering",
    desc: "69 fitur diekstraksi otomatis",
    color: "bg-violet-500",
  },
  { step: "3", title: "Dual Model", desc: "XGBoost + MLP melakukan prediksi", color: "bg-amber-500" },
  {
    step: "4",
    title: "Rekomendasi",
    desc: "Sistem memberikan rekomendasi risiko",
    color: "bg-emerald-500",
  },
];

export default function HomePage() {
  return (
    <div className="page-shell space-y-10 pb-6">
      {/* Hero */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end animate-in">
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.08em] text-primary uppercase">
            intelligent decision support
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            IDSS Piutang
          </h1>
          <p className="max-w-[62ch] text-base text-muted-foreground sm:text-lg">
            Sistem Pendukung Keputusan Cerdas untuk Prediksi Risiko
            Keterlambatan Pembayaran Piutang
          </p>
        </div>
        <Card className="relative overflow-hidden surface-card">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 to-primary/10" />
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Model rekomendasi aktif
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              XGBoost + MLP
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Kalibrasi probabilitas dikombinasikan dengan threshold operasional
              untuk keputusan yang lebih konsisten.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={`stat-card ${stat.cardClass}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium tracking-tight">
                  {stat.label}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">
                  {typeof stat.value === "number"
                    ? fmtNumber(stat.value)
                    : stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* How it works */}
      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Cara kerja sistem</CardTitle>
          <CardDescription>
            Dari input transaksi hingga rekomendasi risiko dalam 4 langkah
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className="group relative flex items-start gap-3 rounded-xl border border-border/70 p-4 bg-card/70 hover:bg-muted/40 transition-colors"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.color} text-white text-sm font-bold shadow-sm`}
                >
                  {s.step}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden lg:block h-4 w-4 text-muted-foreground/50 self-center ml-auto group-hover:text-muted-foreground transition-colors" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model overview */}
      <div className="grid gap-4 md:grid-cols-2 stagger-children">
        <Card className="surface-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/50 to-transparent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                <Trees className="h-4 w-4 text-emerald-500" />
              </div>
              XGBoost
              <Badge variant="outline" className="ml-auto text-xs">Precision-oriented</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1.5">
            <p>• AUC-ROC lebih tinggi (~0.81)</p>
            <p>• Precision lebih tinggi — lebih sedikit false alarm</p>
            <p>• Kalibrasi lebih baik</p>
            <p>• Lebih stabil di berbagai random split</p>
          </CardContent>
        </Card>
        <Card className="surface-card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/50 to-transparent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
                <Brain className="h-4 w-4 text-rose-500" />
              </div>
              MLP (Neural Network)
              <Badge variant="outline" className="ml-auto text-xs">Recall-oriented</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1.5">
            <p>• Recall lebih tinggi — menangkap lebih banyak piutang macet</p>
            <p>• F1 Score lebih tinggi (seimbang)</p>
            <p>• Lebih baik mendeteksi pola non-linear</p>
            <p>• Melengkapi XGBoost dalam dual-model</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick navigation */}
      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Navigasi cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {NAV_ITEMS.filter((n) => n.href !== "/").map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 p-3.5 hover:bg-muted/50 hover:border-primary/30 transition-all"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 text-primary transition-transform group-hover:scale-105">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.group}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
