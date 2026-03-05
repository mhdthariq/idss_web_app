import {
  Home,
  FileText,
  FolderOpen,
  BarChart3,
  TrendingUp,
  Trophy,
  Search,
  Ruler,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://idss-api.vercel.app";

export const DEFAULT_THRESHOLD = 0.5;

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  emoji: string;
  group?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Beranda", href: "/", icon: Home, emoji: "🏠", group: "Utama" },
  {
    label: "Prediksi Risiko",
    href: "/predict",
    icon: FileText,
    emoji: "📝",
    group: "Prediksi",
  },
  {
    label: "Prediksi Batch",
    href: "/predict/batch",
    icon: FolderOpen,
    emoji: "📂",
    group: "Prediksi",
  },
  {
    label: "Analisis Test Set",
    href: "/analysis/test-set",
    icon: BarChart3,
    emoji: "📊",
    group: "Analisis",
  },
  {
    label: "Stabilitas Model",
    href: "/analysis/stability",
    icon: TrendingUp,
    emoji: "📈",
    group: "Analisis",
  },
  {
    label: "Perbandingan Model",
    href: "/analysis/comparison",
    icon: Trophy,
    emoji: "🏆",
    group: "Analisis",
  },
  {
    label: "Fitur Penting",
    href: "/analysis/features",
    icon: Search,
    emoji: "🔍",
    group: "Analisis",
  },
  {
    label: "Kalibrasi & Statistik",
    href: "/analysis/calibration",
    icon: Ruler,
    emoji: "📐",
    group: "Analisis",
  },
  {
    label: "Log Keputusan",
    href: "/decisions",
    icon: ClipboardList,
    emoji: "📋",
    group: "Riwayat",
  },
];

export const RISK_LEVELS = [
  { max: 0.4, label: "Rendah", color: "#22c55e" },
  { max: 0.7, label: "Sedang", color: "#f59e0b" },
  { max: 1.0, label: "Tinggi", color: "#ef4444" },
] as const;
