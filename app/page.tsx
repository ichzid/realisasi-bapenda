import { DashboardClient } from "./components/DashboardClient";
import { getSummaryData } from "./lib/bapenda-api";
import type { TaxSummaryResponse } from "./lib/bapenda-contract";

export default async function Home() {
  let data: TaxSummaryResponse | null = null;
  let error: string | null = null;

  try {
    data = await getSummaryData(undefined, { revalidate: 15 });
  } catch {
    // Jangan gagalkan build hanya karena API down
    error = "API tidak tersedia saat build. Data akan muncul saat halaman di-reload di browser.";
  }

  return <DashboardClient initialData={data} initialError={error} />;
}
