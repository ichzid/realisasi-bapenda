import { getSummaryData } from "@/app/lib/bapenda-api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get("tahun") ?? undefined;
    const data = await getSummaryData(tahun, { cache: "no-store" });
    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Gagal mengambil data realisasi pajak.",
      },
      { status: 502 },
    );
  }
}
