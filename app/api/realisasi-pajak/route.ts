import { getSummaryData } from "@/app/lib/bapenda-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await getSummaryData(searchParams.get("tahun"));
    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Gagal mengambil data realisasi pajak.",
      },
      { status: 500 },
    );
  }
}
