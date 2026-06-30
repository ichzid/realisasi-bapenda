import { DashboardClient } from "./components/DashboardClient";
import { getSummaryData } from "./lib/bapenda-api";

export default async function Home() {
  const data = await getSummaryData(undefined, { revalidate: 15 });
  return <DashboardClient initialData={data} />;
}
