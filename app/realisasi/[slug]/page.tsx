import { DetailPageClient } from "./DetailPageClient";

interface DetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tahun?: string; page?: string; per_page?: string }>;
}

export default async function DetailPage({ params, searchParams }: DetailPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const nowYear = new Date().getFullYear();
  const requestedYear = query.tahun ? Number(query.tahun) : nowYear;
  const requestedPage = query.page ? Number(query.page) : 1;
  const requestedPerPage = query.per_page ? Number(query.per_page) : 10;

  const year = Number.isFinite(requestedYear) ? requestedYear : nowYear;
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const perPage = Number.isFinite(requestedPerPage) && requestedPerPage > 0 ? requestedPerPage : 10;

  return (
    <DetailPageClient
      slug={slug}
      initialYear={year}
      initialPage={page}
      initialPerPage={perPage}
    />
  );
}
