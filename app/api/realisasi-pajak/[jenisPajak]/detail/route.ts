import { getDetailData } from "@/app/lib/bapenda-api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jenisPajak: string }> },
) {
  const { jenisPajak } = await params;
  const { searchParams } = new URL(request.url);
  const result = await getDetailData(jenisPajak, searchParams, { revalidate: 10 });
  return Response.json(result.body, { status: result.status });
}
