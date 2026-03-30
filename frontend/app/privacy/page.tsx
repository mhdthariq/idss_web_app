export default function PrivacyPage() {
  return (
    <article className="page-shell max-w-3xl space-y-4 py-3">
      <h1 className="text-3xl font-semibold tracking-tight">
        Kebijakan privasi
      </h1>
      <p className="text-muted-foreground">
        Aplikasi ini menyimpan log keputusan di localStorage browser untuk
        membantu evaluasi prediksi. Data tidak dikirim ke pihak ketiga dari sisi
        frontend.
      </p>
      <p className="text-muted-foreground">
        Gunakan data operasional sesuai kebijakan organisasi Anda. Hapus log
        kapan pun dari halaman Log Keputusan jika diperlukan.
      </p>
    </article>
  );
}
