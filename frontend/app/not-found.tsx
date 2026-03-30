import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="page-shell flex min-h-[70dvh] items-center justify-center py-12">
      <div className="surface-card w-full max-w-2xl rounded-3xl p-8 text-center sm:p-12">
        <p className="text-sm font-medium tracking-[0.08em] text-primary">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mx-auto mt-4 max-w-[60ch] text-sm text-muted-foreground sm:text-base">
          Tautan yang Anda buka mungkin sudah berubah atau tidak tersedia.
          Kembali ke beranda untuk melanjutkan alur analisis.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Kembali ke beranda</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/predict">Buka prediksi</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
