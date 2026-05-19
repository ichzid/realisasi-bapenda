"use client";


import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ApiErrorResponse,
  TaxDataSource,
  TaxDetailPaymentItem,
  TaxDetailResponse,
  TaxSummaryResponse,
} from "@/app/lib/bapenda-contract";

interface DetailPageClientProps {
  slug: string;
  initialYear: number;
  initialPage: number;
  initialPerPage: number;
}

type SortBy = "tgl_bayar" | "no_sts" | "nama_pemilik" | "nilai" | "total_bayar";
type SortDir = "asc" | "desc";

const FETCH_ALL_PER_PAGE = 1000;
const PER_PAGE_OPTIONS = [10, 25, 50, 100];

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatRupiah(n: number): string {
  return n.toLocaleString("id-ID");
}
function formatMilyar(n: number): string {
  const abs = Math.abs(n);
  const prefix = n < 0 ? "- " : "";
  return `${prefix}Rp ${formatRupiah(abs)}`;
}
function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function getSourceLabel(source: TaxDataSource): string {
  if (source === "epbb_db") return "EPBB";
  if (source === "simpada") return "SIMPADA";
  return "STS";
}
function buildPaymentKey(payment: TaxDetailPaymentItem, index: number): string {
  return [payment.no_sts ?? "sts", payment.no_nop ?? "nop", payment.kode_pengesahan ?? "kode", payment.tgl_bayar ?? "t", payment.total_bayar, index].join("-");
}

/** Shimmer skeleton */
function Skeleton({ width = "6rem", height = "1em", radius = "0.4rem" }: {
  width?: string; height?: string; radius?: string;
}) {
  return <span className="skeleton-bar" style={{ display: "inline-block", width, height, borderRadius: radius, verticalAlign: "middle" }} />;
}

interface DetailRingkasan {
  target: number;
  realisasi: number;
  persentase_capaian: number;
  sisa_anggaran: number;
  jumlah_transaksi: number;
}

/* ── Sort icon component ─────────────────────────────────────────────── */
function SortIcon({ column, sortBy, sortDir }: { column: SortBy; sortBy: SortBy; sortDir: SortDir }) {
  const isActive = column === sortBy;
  return (
    <span className="dt-sort-icon" aria-hidden>
      <span className={`dt-sort-asc ${isActive && sortDir === "asc" ? "dt-sort-active" : ""}`}>▲</span>
      <span className={`dt-sort-desc ${isActive && sortDir === "desc" ? "dt-sort-active" : ""}`}>▼</span>
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DetailPageClient
════════════════════════════════════════════════════════════════════════ */
export function DetailPageClient({ slug, initialYear, initialPage, initialPerPage }: DetailPageClientProps) {
  const router = useRouter();
  const [year] = useState(initialYear);
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [sortBy, setSortBy] = useState<SortBy>("tgl_bayar");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  /* Detail (fetch all, sort/paginate client-side) */
  const [allRows, setAllRows] = useState<TaxDetailPaymentItem[]>([]);
  const [jenisPajak, setJenisPajak] = useState<TaxDetailResponse["data"]["jenis_pajak"] | null>(null);
  const [ringkasan, setRingkasan] = useState<DetailRingkasan | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailFetched, setDetailFetched] = useState(false);

  const firstLoadRef = useRef(true);

  /* ── Fetch ALL rows (one-shot, parallel if capped) ───────────────── */
  const fetchAllRows = useCallback(async (signal: AbortSignal) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetailFetched(false);

    const res = await fetch(
      `/api/realisasi-pajak/${slug}/detail?tahun=${year}&page=1&per_page=${FETCH_ALL_PER_PAGE}`,
      { cache: "no-store", signal },
    );
    const payload = (await res.json()) as TaxDetailResponse | ApiErrorResponse;
    if (!res.ok || payload.success === false) {
      throw new Error((payload as ApiErrorResponse).message ?? "Gagal memuat detail.");
    }

    const first = payload as TaxDetailResponse;
    let collected: TaxDetailPaymentItem[] = [...first.data.pembayaran.data];

    if (first.data.pembayaran.pagination.has_more_pages) {
      const lastPage = first.data.pembayaran.pagination.last_page;
      const pages = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, i) =>
          fetch(`/api/realisasi-pajak/${slug}/detail?tahun=${year}&page=${i + 2}&per_page=${FETCH_ALL_PER_PAGE}`, {
            cache: "no-store", signal,
          }).then(async (r) => {
            const p = (await r.json()) as TaxDetailResponse | ApiErrorResponse;
            if (!r.ok || p.success === false) return [] as TaxDetailPaymentItem[];
            return (p as TaxDetailResponse).data.pembayaran.data;
          }),
        ),
      );
      for (const rows of pages) collected = [...collected, ...rows];
    }

    setAllRows(collected);
    setJenisPajak(first.data.jenis_pajak);
    setRingkasan(first.data.ringkasan);
    setDetailFetched(true);
    setDetailLoading(false);
  }, [slug, year]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllRows(controller.signal).catch((err: unknown) => {
      if (err instanceof Error && err.name === "AbortError") return;
      setDetailError(err instanceof Error ? err.message : "Gagal memuat detail.");
      setDetailLoading(false);
    });
    return () => controller.abort();
  }, [fetchAllRows]);

  /* ── Sync URL ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (firstLoadRef.current) { firstLoadRef.current = false; return; }
    const params = new URLSearchParams({ tahun: String(year), page: String(page), per_page: String(perPage) });
    startTransition(() => { router.replace(`/realisasi/${slug}?${params.toString()}`, { scroll: false }); });
  }, [router, slug, year, page, perPage]);

  /* ── Search filter ───────────────────────────────────────────────── */
  const filteredRows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.toLowerCase();
    return allRows.filter(
      (r) =>
        (r.nama_pemilik ?? "").toLowerCase().includes(q) ||
        (r.no_sts ?? "").toLowerCase().includes(q) ||
        (r.no_nop ?? "").toLowerCase().includes(q) ||
        String(r.total_bayar).includes(q) ||
        String(r.nilai).includes(q),
    );
  }, [allRows, search]);

  /* ── Sort ────────────────────────────────────────────────────────── */
  const sortedRows = useMemo(() => {
    if (!filteredRows.length) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortBy) {
        case "nama_pemilik": aVal = (a.nama_pemilik ?? "").toLowerCase(); bVal = (b.nama_pemilik ?? "").toLowerCase(); break;
        case "total_bayar":  aVal = a.total_bayar;  bVal = b.total_bayar;  break;
        case "no_sts":       aVal = (a.no_sts ?? "").toLowerCase(); bVal = (b.no_sts ?? "").toLowerCase(); break;
        case "nilai":        aVal = a.nilai;        bVal = b.nilai;        break;
        default: /* tgl_bayar */ aVal = a.tgl_bayar ?? ""; bVal = b.tgl_bayar ?? "";
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortBy, sortDir]);

  /* ── Pagination ──────────────────────────────────────────────────── */
  const totalCount    = sortedRows.length;
  const totalPages    = Math.max(1, Math.ceil(totalCount / perPage));
  const safePage      = Math.min(page, totalPages);
  const pageStart     = (safePage - 1) * perPage;
  const pageEnd       = Math.min(pageStart + perPage, totalCount);
  const pagedRows     = useMemo(() => sortedRows.slice(pageStart, pageEnd), [sortedRows, pageStart, pageEnd]);
  const hasPrev       = safePage > 1;
  const hasNext       = safePage < totalPages;

  /* ── Metrics ─────────────────────────────────────────────────────── */
  const targetValue    = ringkasan?.target                  ?? 0;
  const realisasiValue = ringkasan?.realisasi               ?? 0;
  const capaianValue   = ringkasan?.persentase_capaian      ?? 0;
  const transaksiValue = ringkasan?.jumlah_transaksi        ?? null;
  const sisaValue      = ringkasan?.sisa_anggaran           ?? Math.max(targetValue - realisasiValue, 0);

  /* ── Column sort helper ──────────────────────────────────────────── */
  function handleColSort(col: SortBy) {
    if (col === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
    setPage(1);
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="dp-shell">
      <div className="bg-accent-orb" />
      <div className="glow-line" />

      {/* Top bar */}
      <header className="dp-topbar">
        <div className="dp-topbar-left">
          <a href="/" className="detail-back-link">← Kembali ke dashboard</a>
          <span className="dp-topbar-sep">/</span>
          <span className="dp-topbar-crumb">
            {detailLoading ? <Skeleton width="8rem" /> : (jenisPajak?.nama ?? slug)}
          </span>
        </div>
        <div className="dp-topbar-right">
          <span>Pemerintah Kabupaten Batubara</span>
          <strong>Badan Pendapatan Daerah</strong>
        </div>
      </header>

      {/* Hero metrics */}
      <section className="dp-hero">
        <div className="dp-hero-metrics">
          <HeroMetric label="Total Realisasi" value={detailLoading ? null : formatMilyar(realisasiValue)} accent="gold" />
          <HeroMetric label="Target"          value={detailLoading ? null : formatMilyar(targetValue)} />
          <HeroMetric label="Capaian"         value={detailLoading ? null : `${capaianValue.toFixed(2)}%`} accent="green" />
          <HeroMetric label="Sisa Anggaran"   value={detailLoading ? null : formatMilyar(sisaValue)} />
          <HeroMetric label="Total Transaksi" value={detailLoading ? null : transaksiValue !== null ? formatRupiah(transaksiValue) : "-"} />
        </div>
      </section>

      {/* DataTable panel */}
      <section className="dp-panel">

        {/* ── DataTable toolbar: title left, search right ── */}
        <div className="dt-toolbar">
          <div className="dt-toolbar-left">
            <h2 className="dt-title">Daftar Riwayat Pembayaran</h2>
          </div>
          <div className="dt-toolbar-right">
            <div className="dt-search-wrap">
              <span className="dt-search-icon">⌕</span>
              <input
                id="dt-search"
                type="search"
                className="dt-search"
                placeholder="Cari wajib pajak, NOP, STS…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                disabled={!detailFetched}
              />
            </div>
            <label className="dt-per-page-label">
              Show
              <select
                className="dt-per-page-select"
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                disabled={!detailFetched}
              >
                {PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              entries
            </label>
          </div>
        </div>

        {/* Notices */}
        {detailError && <NoticeCard title="Data tidak dapat dimuat" description={detailError} />}

        {/* Table */}
        <div className="dp-table-wrap">
          <table className="dt-table">
            <colgroup>
              <col style={{ width: "16%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "29%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="dt-th dt-th-sortable" onClick={() => handleColSort("tgl_bayar")}>
                  <span className="dt-th-inner">
                    Tanggal & Channel
                    <SortIcon column="tgl_bayar" sortBy={sortBy} sortDir={sortDir} />
                  </span>
                </th>
                <th className="dt-th dt-th-sortable" onClick={() => handleColSort("no_sts")}>
                  <span className="dt-th-inner">
                    STS / NOP
                    <SortIcon column="no_sts" sortBy={sortBy} sortDir={sortDir} />
                  </span>
                </th>
                <th className="dt-th dt-th-sortable" onClick={() => handleColSort("nama_pemilik")}>
                  <span className="dt-th-inner">
                    Wajib Pajak
                    <SortIcon column="nama_pemilik" sortBy={sortBy} sortDir={sortDir} />
                  </span>
                </th>
                <th className="dt-th dt-th-sortable dt-th-right" onClick={() => handleColSort("nilai")}>
                  <span className="dt-th-inner" style={{ justifyContent: "flex-end" }}>
                    Rincian Bayar
                    <SortIcon column="nilai" sortBy={sortBy} sortDir={sortDir} />
                  </span>
                </th>
                <th className="dt-th dt-th-sortable dt-th-right" onClick={() => handleColSort("total_bayar")}>
                  <span className="dt-th-inner" style={{ justifyContent: "flex-end" }}>
                    Total Bayar
                    <SortIcon column="total_bayar" sortBy={sortBy} sortDir={sortDir} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {detailLoading ? (
                Array.from({ length: perPage }).map((_, i) => (
                  <tr key={i} className="dt-skeleton-row">
                    <td><Skeleton width="7rem" /></td>
                    <td><Skeleton width="9rem" /></td>
                    <td><Skeleton width="8rem" /></td>
                    <td><Skeleton width="5rem" /></td>
                    <td style={{ textAlign: "right" }}><Skeleton width="6rem" /></td>
                  </tr>
                ))
              ) : pagedRows.length ? (
                pagedRows.map((payment, i) => (
                  <PaymentRow key={buildPaymentKey(payment, pageStart + i)} payment={payment} />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="dt-empty">
                    {search ? `Tidak ada data yang cocok dengan "${search}"` : "Belum ada transaksi."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── DataTable footer: info left, pagination right ── */}
        {(detailFetched || detailLoading) && (
          <div className="dt-footer">
            <span className="dt-info">
              {detailLoading
                ? <Skeleton width="12rem" />
                : totalCount === 0
                  ? "Tidak ada data"
                  : `Menampilkan ${pageStart + 1}–${pageEnd} dari ${formatRupiah(totalCount)} entri${search ? ` (difilter dari ${formatRupiah(allRows.length)} total)` : ""}`}
            </span>
            <div className="dt-pagination">
              <button
                type="button"
                className={`dt-page-btn ${!hasPrev ? "dt-page-btn-disabled" : ""}`}
                onClick={() => { if (hasPrev) setPage((p) => Math.max(p - 1, 1)); }}
                disabled={!hasPrev}
              >‹ Sebelumnya</button>

              {/* Page number pills */}
              <div className="dt-page-pills">
                {buildPagePills(safePage, totalPages).map((item, i) =>
                  item === "…" ? (
                    <span key={`ellipsis-${i}`} className="dt-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={`dt-page-pill ${item === safePage ? "dt-page-pill-active" : ""}`}
                      onClick={() => setPage(item as number)}
                    >{item}</button>
                  ),
                )}
              </div>

              <button
                type="button"
                className={`dt-page-btn ${!hasNext ? "dt-page-btn-disabled" : ""}`}
                onClick={() => { if (hasNext) setPage((p) => p + 1); }}
                disabled={!hasNext}
              >Berikutnya ›</button>
            </div>
          </div>
        )}

      </section>
    </div>
  );
}

/* ── Page pill builder (shows first, last, current ±1, with ellipsis) ── */
function buildPagePills(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  add(1);
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) add(i);
  if (current < total - 2) pages.push("…");
  add(total);
  return pages;
}

/* ── Sub-components ──────────────────────────────────────────────────── */
function HeroMetric({ label, value, accent }: { label: string; value: string | null; accent?: "gold" | "green" }) {
  const colorClass = accent === "gold" ? "text-accent-gold" : accent === "green" ? "text-accent-green" : "text-text-primary";
  return (
    <div className="dp-metric">
      <span className="dp-metric-label">{label}</span>
      <span className={`dp-metric-value ${colorClass}`}>
        {value === null ? <Skeleton width="7rem" height="1.1em" /> : value}
      </span>
    </div>
  );
}

function NoticeCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="detail-page-notice">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function PaymentRow({ payment }: { payment: TaxDetailPaymentItem }) {
  return (
    <tr className="dt-row">
      <td className="dt-td">
        <div className="detail-page-cell-stack">
          <strong>{formatDateTime(payment.tgl_bayar)}</strong>
          <span className="dt-cell-sub">{payment.nama_channel ?? "-"}</span>
        </div>
      </td>
      <td className="dt-td">
        <div className="detail-page-cell-stack">
          <strong>{payment.no_sts ?? "-"}</strong>
          <span className="dt-cell-sub">{payment.no_nop ?? payment.kode_pengesahan ?? "-"}</span>
        </div>
      </td>
      <td className="dt-td">
        <div className="detail-page-cell-stack">
          <strong>{payment.nama_pemilik ?? "-"}</strong>
          <span className="dt-cell-sub">{payment.no_pokok_wp ?? payment.alamat_pemilik ?? "-"}</span>
        </div>
      </td>
      <td className="dt-td dt-td-right">
        <div className="detail-page-cell-stack" style={{ alignItems: "flex-end" }}>
          <strong>Pokok: Rp {formatRupiah(payment.nilai)}</strong>
          <span className="dt-cell-sub">Denda: Rp {formatRupiah(payment.denda)}</span>
        </div>
      </td>
      <td className="dt-td dt-td-right dt-currency">Rp {formatRupiah(payment.total_bayar)}</td>
    </tr>
  );
}
