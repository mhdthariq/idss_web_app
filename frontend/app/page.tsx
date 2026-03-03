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
import {
  ArrowRight,
  Database,
  Users,
  AlertTriangle,
  Cpu,
} from "lucide-react";

const STATS = [
  { label: "Total Transaksi", value: 6357, icon: Database, color: "text-blue-500" },
  { label: "Unique Customers", value: 2016, icon: Users, color: "text-green-500" },
  { label: "Late Payment Rate", value: "~32%", icon: AlertTriangle, color: "text-amber-500" },
  { label: "Fitur yang Digunakan", value: 69, icon: Cpu, color: "text-purple-500" },
];

const STEPS = [
  { step: "1", title: "Input", desc: "Masukkan data transaksi" },
  { step: "2", title: "Feature Engineering", desc: "69 fitur diekstraksi otomatis" },
  { step: "3", title: "Dual Model", desc: "XGBoost + MLP melakukan prediksi" },
  { step: "4", title: "Rekomendasi", desc: "Sistem memberikan rekomendasi risiko" },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          IDSS Piutang
        </h1>
        <p className="text-lg text-muted-foreground">
          Sistem Pendukung Keputusan Cerdas untuk Prediksi Risiko
          Keterlambatan Pembayaran Piutang
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {typeof stat.value === "number"
                    ? fmtNumber(stat.value)
                    : stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>🔄 Cara Kerja Sistem</CardTitle>
          <CardDescription>
            Dari input transaksi hingga rekomendasi risiko dalam 4 langkah
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className="flex items-start gap-3 rounded-lg border p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden lg:block h-4 w-4 text-muted-foreground self-center ml-auto" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🌲 XGBoost
              <Badge variant="outline">Precision-oriented</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• AUC-ROC lebih tinggi (~0.81)</p>
            <p>• Precision lebih tinggi — lebih sedikit false alarm</p>
            <p>• Kalibrasi lebih baik</p>
            <p>• Lebih stabil di berbagai random split</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🧠 MLP (Neural Network)
              <Badge variant="outline">Recall-oriented</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• Recall lebih tinggi — menangkap lebih banyak piutang macet</p>
            <p>• F1 Score lebih tinggi (seimbang)</p>
            <p>• Lebih baik mendeteksi pola non-linear</p>
            <p>• Melengkapi XGBoost dalam dual-model</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick navigation */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Navigasi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NAV_ITEMS.filter((n) => n.href !== "/").map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.group}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
