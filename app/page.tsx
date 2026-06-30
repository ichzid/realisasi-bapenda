import { DashboardClient } from "./components/DashboardClient";
import { getSummaryData } from "./lib/bapenda-api";
import type { TaxSummaryResponse } from "./lib/bapenda-contract";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EMPTY_DATA: TaxSummaryResponse = {
  success: false,
  message: "",
  tahun: new Date().getFullYear(),
  ringkasan: {
    total_target: 0,
    total_realisasi: 0,
    persentase_capaian: 0,
    selisih_anggaran: 0,
  },
  rincian: [],
};

export default async function Home() {
  let data: TaxSummaryResponse;
  try {
    data = await getSummaryData(undefined, { cache: "no-store" });
  } catch {
    data = EMPTY_DATA;
  }
  return <DashboardClient initialData={data} />;
}
