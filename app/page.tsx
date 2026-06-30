export const dynamic = "force-dynamic";

import { DashboardClient } from "./components/DashboardClient";
import { getSummaryData } from "./lib/bapenda-api";
import type { TaxSummaryResponse } from "./lib/bapenda-contract";

export default async function Home() {
  let data: TaxSummaryResponse | null = null;
  let error: string | null = null;

  try {
    data = await getSummaryData(undefined, { cache: "no-store" });
  } catch {
    error = "API tidak tersedia. Data akan dimuat ulang otomatis.";
  }

  return <DashboardClient initialData={data} initialError={error} />;
}
