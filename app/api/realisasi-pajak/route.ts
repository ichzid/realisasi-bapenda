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
    const errorMessage = error instanceof Error ? error.message : "Gagal mengambil data realisasi pajak.";
    const errorCause = error instanceof Error && error.cause ? String(error.cause) : null;
    console.error("[/api/realisasi-pajak] fetch error:", errorMessage, errorCause);
    return Response.json(
      {
        success: false,
        message: errorMessage,
        cause: errorCause,
        target_url: process.env.BAPENDA_API_BASE_URL ?? process.env.NEXT_PUBLIC_BAPENDA_API_BASE_URL ?? "https://api-bapenda.ichmal.my.id/api",
      },
      { status: 502 },
    );
  }
}
