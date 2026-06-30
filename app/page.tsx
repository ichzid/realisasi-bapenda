export const dynamic = "force-dynamic";

import { DashboardClient } from "./components/DashboardClient";
import { getSummaryData } from "./lib/bapenda-api";
import type { TaxSummaryResponse } from "./lib/bapenda-contract";

export default async function Home() {
  let data: TaxSummaryResponse | null = null;
  let error: string | null = null;

  try {
    data = await getSummaryData(undefined, { revalidate: 15 });
  } catch {
    // Jika API gagal saat runtime, tampilkan error dan polling akan mencoba lagi
    error = "API tidak tersedia. Silakan coba lagi nanti.";
  }

  return <DashboardClient initialData={data} initialError={error} />;
}
