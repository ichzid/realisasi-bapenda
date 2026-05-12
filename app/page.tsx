import { DashboardClient } from "./components/DashboardClient";

interface RincianItem {
  jenis_pajak: string;
  target: number;
  realisasi: number;
  persentase: number;
  selisih: number;
}

interface ApiResponse {
  success: boolean;
  tahun: number;
  ringkasan: {
    total_target: number;
    total_realisasi: number;
    persentase_capaian: number;
    selisih_anggaran: number;
  };
  rincian: RincianItem[];
}

async function getRealisasiData(): Promise<ApiResponse> {
  const res = await fetch("https://api-bapenda.ichmal.my.id/api/realisasi-pajak", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Gagal mengambil data realisasi pajak");
  return res.json();
}

export default async function Home() {
  const data = await getRealisasiData();
  return <DashboardClient initialData={data} />;
}
