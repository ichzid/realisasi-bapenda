import { getDetailData } from "@/app/lib/bapenda-api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jenisPajak: string }> },
) {
  const { jenisPajak } = await params;
  const { searchParams } = new URL(request.url);
  const result = await getDetailData(jenisPajak, searchParams);

  return Response.json(result.body, { status: result.status });
}
